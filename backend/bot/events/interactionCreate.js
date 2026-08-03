/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, AttachmentBuilder, ChannelType } from 'discord.js';
import { ensureGuildStorage, getGuildSettings, saveGuildSettings, addGuildAudit, DATA_DIR } from '../storage.js';
import { issueWarning } from '../utils/warnings.js';
import { statusEmoji, statusEmojiObject } from '../utils/statusEmojis.js';
import { getEmoji, Emojis } from '../utils/emojis.js';
import { CUSTOM_EMOJIS, getCustomEmoji } from '../utils/customEmojis.js';
import { getHelpEmbedAndComponents, setHelpTimeout, clearHelpTimeout } from '../utils/helpEmbed.js';
import { getServerInfoEmbedAndComponents } from '../utils/serverInfoEmbed.js';
import { getUserInfoEmbedAndComponents } from '../utils/userInfoEmbed.js';
import {
  createDmSession,
  getDmSession,
  deleteDmSession,
  getInitialDmDispatchEmbedAndComponents,
  getEmbedBuilderViewAndComponents,
  createEmbedFieldModal,
  createSimpleMessageModal
} from '../utils/dmBuilder.js';
import {
  createChannelEmbedSession,
  getChannelEmbedSession,
  deleteChannelEmbedSession,
  getChannelEmbedBuilderViewAndComponents,
  getChannelSelectViewAndComponents,
  createChannelEmbedFieldModal
} from '../utils/channelEmbedBuilder.js';
import {
  createTicketSetupSession,
  getTicketSetupSession,
  deleteTicketSetupSession,
  getTicketSetupBuilderViewAndComponents,
  createTicketFieldModal,
  createAddTicketButtonModal,
  createAddTicketMenuOptionModal,
  buildCategorySelectForComponentView
} from '../utils/ticketSetupBuilder.js';
import fs from 'fs';
import path from 'path';

/**
 * Builds a clean, fully customizable DM embed without forcing server-specific branding or custom emojis
 */
function buildCustomDmEmbed(options) {
  const { title, message, color, thumbnail, image, footer } = options;
  const embed = new EmbedBuilder();

  if (title && title.trim()) {
    embed.setTitle(title.trim());
  }

  if (message && message.trim()) {
    embed.setDescription(message.trim());
  }

  let hexColor = '#5865F2';
  if (color && color.trim()) {
    const raw = color.trim().toLowerCase();
    if (raw.startsWith('#')) {
      hexColor = raw;
    } else if (raw === 'red') {
      hexColor = '#EF4444';
    } else if (raw === 'green') {
      hexColor = '#10B981';
    } else if (raw === 'blue') {
      hexColor = '#3B82F6';
    } else if (raw === 'purple') {
      hexColor = '#8B5CF6';
    } else if (raw === 'yellow' || raw === 'gold') {
      hexColor = '#F59E0B';
    } else if (/^[0-9a-f]{6}$/i.test(raw)) {
      hexColor = `#${raw}`;
    }
  }
  embed.setColor(hexColor);

  if (thumbnail && thumbnail.trim() && thumbnail.startsWith('http')) {
    embed.setThumbnail(thumbnail.trim());
  }

  if (image && image.trim() && image.startsWith('http')) {
    embed.setImage(image.trim());
  }

  if (footer && footer.trim()) {
    embed.setFooter({ text: footer.trim() });
  }

  return embed;
}

/**
 * Helper to display a confirmation embed with Yes/No buttons containing status icons
 */
function resolveEmojiObject(input, fallbackKey = 'success') {
  if (input && typeof input === 'object' && (input.id || input.name)) return input;
  if (typeof input === 'string') {
    const match = input.match(/<a?:(\w+):(\d+)>/);
    if (match) {
      return { id: match[2], name: match[1], animated: input.startsWith('<a:') };
    }
    const resolved = statusEmojiObject(input);
    if (resolved) return resolved;
    if (/^\d+$/.test(input)) {
      return { id: input };
    }
    return { name: input };
  }
  return statusEmojiObject(fallbackKey) || { name: fallbackKey === 'success' ? '✅' : '❌' };
}

async function handleActionConfirmation({
  interaction,
  actionTitle,
  actionPrompt,
  targetUser,
  fields = [],
  color = '#F59E0B',
  actionType = null,
  confirmEmoji = null,
  cancelEmoji = null,
  confirmLabel = 'Yes',
  cancelLabel = 'No',
  onConfirm
}) {
  const confirmEmbed = new EmbedBuilder()
    .setTitle(actionTitle)
    .setColor(color)
    .setDescription(actionPrompt)
    .addFields(fields)
    .setFooter({ text: 'Confirmation required • Expires in 30s' });

  const yesEmoji = resolveEmojiObject(confirmEmoji || actionType, 'success');
  const noEmoji = resolveEmojiObject(cancelEmoji, 'error');

  const confirmBtn = new ButtonBuilder()
    .setCustomId(`confirm_${interaction.id}`)
    .setLabel(confirmLabel)
    .setStyle(ButtonStyle.Danger);

  if (yesEmoji) {
    confirmBtn.setEmoji(yesEmoji);
  }

  const cancelBtn = new ButtonBuilder()
    .setCustomId(`cancel_${interaction.id}`)
    .setLabel(cancelLabel)
    .setStyle(ButtonStyle.Secondary);

  if (noEmoji) {
    cancelBtn.setEmoji(noEmoji);
  }

  const row = new ActionRowBuilder().addComponents(confirmBtn, cancelBtn);
  const message = await interaction.editReply({ embeds: [confirmEmbed], components: [row] });

  const collector = message.createMessageComponentCollector({
    filter: i => i.user.id === interaction.user.id,
    time: 30000
  });

  collector.on('collect', async i => {
    if (i.customId.startsWith('confirm_')) {
      await i.deferUpdate();
      try {
        await onConfirm();
      } catch (err) {
        const errorIcon = statusEmoji('error') || getEmoji('nexus_xmark') || '❌';
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Action failed: ${err.message}`);
        await interaction.editReply({ embeds: [embed], components: [] });
      }
    } else {
      await i.deferUpdate();
      const errorIcon = statusEmoji('error') || getEmoji('nexus_xmark') || '❌';
      const embed = new EmbedBuilder()
        .setColor('#6B7280')
        .setDescription(`${errorIcon} Action cancelled.`);
      await interaction.editReply({ embeds: [embed], components: [] });
    }
    collector.stop();
  });

  collector.on('end', (collected, reason) => {
    if (reason === 'time' && collected.size === 0) {
      const errorIcon = statusEmoji('error') || getEmoji('nexus_xmark') || '❌';
      const embed = new EmbedBuilder()
        .setColor('#6B7280')
        .setDescription(`${errorIcon} Confirmation timed out. No action taken.`);
      interaction.editReply({ embeds: [embed], components: [] }).catch(() => {});
    }
  });
}

export default async function handleInteraction(interaction) {
  const { client } = interaction;

  if (interaction.isChatInputCommand()) {
    const { commandName, guildId, user } = interaction;
    if (!guildId) {
      const errorIcon = statusEmoji('error') || '❌';
      const embed = new EmbedBuilder()
        .setColor('#EF4444')
        .setDescription(`${errorIcon} NexusBot commands can only be used inside Discord servers.`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    ensureGuildStorage(guildId);
    const settings = getGuildSettings(guildId);

    // Ensure settings object has standard structure
    if (!settings.automod) settings.automod = { enabled: false };
    if (!settings.antiraid) settings.antiraid = { enabled: false };
    if (!settings.antinuke) settings.antinuke = { enabled: false };

    // Common semantic icons with custom emoji fallbacks
    const successIcon = statusEmoji('success') || getEmoji('nexus_checkmark');
    const errorIcon = statusEmoji('error') || getEmoji('nexus_xmark');
    const warnIcon = statusEmoji('warning') || getEmoji('nexus_warn');
    const infoIcon = statusEmoji('info') || getEmoji('nexus_shield');
    const lockIcon = statusEmoji('lock') || getEmoji('nexus_lock');
    const unlockIcon = statusEmoji('unlock') || getEmoji('nexus_unlock');
    const banIcon = statusEmoji('ban') || getEmoji('nexus_ban');
    const kickIcon = statusEmoji('kick') || getEmoji('nexus_kick');
    const timeoutIcon = statusEmoji('timeout') || getEmoji('nexus_timeout');
    const userIcon = statusEmoji('user') || getEmoji('nexus_user');
    const loadingIcon = statusEmoji('loading') || getEmoji('nexus_loading');
    const trashIcon = statusEmoji('trash') || getEmoji('nexus_trash') || '🗑️';

    const shieldIcon = statusEmoji('shield') || getEmoji('nexus_shield');
    const automodIcon = statusEmoji('automod') || getEmoji('nexus_automod');
    const raidIcon = statusEmoji('raid') || getEmoji('nexus_raid');
    const nukeIcon = statusEmoji('nuke') || getEmoji('nexus_nuke');

    // 1. Help Command
    if (commandName === 'help') {
      const query = interaction.options.getString('command') || interaction.options.getString('module');
      const context = {
        client,
        guild: interaction.guild,
        user: interaction.user,
        prefix: settings.prefix || '!',
        commandQuery: query
      };
      const { embeds, components } = getHelpEmbedAndComponents('home', context);
      const replyMsg = await interaction.reply({ embeds, components, fetchReply: true });
      if (replyMsg) setHelpTimeout(replyMsg, 'home', context);
      return;
    }

    // 1.2 Extract Command
    if (commandName === 'extract') {
      try {
        const emojis = await interaction.guild.emojis.fetch();
        if (!emojis || emojis.size === 0) {
          const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('Server Custom Emojis')
            .setDescription('No custom emojis found in this server.')
            .setFooter({ text: `Requested by ${user.tag}` })
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }

        const formattedList = emojis.map(e => `${e.name} = <${e.animated ? 'a' : ''}:${e.name}:${e.id}>`);
        
        const chunks = [];
        let currentChunk = '';
        for (const line of formattedList) {
          if ((currentChunk + line + '\n').length > 3500) {
            chunks.push(currentChunk);
            currentChunk = line + '\n';
          } else {
            currentChunk += line + '\n';
          }
        }
        if (currentChunk) chunks.push(currentChunk);

        const embeds = chunks.slice(0, 10).map((chunk, index) => {
          return new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(index === 0 ? `Server Custom Emojis (${emojis.size} Total)` : `Server Custom Emojis (Part ${index + 1})`)
            .setDescription(`\`\`\`\n${chunk.trim()}\n\`\`\``)
            .setFooter({ text: `Requested by ${user.tag}` })
            .setTimestamp();
        });

        return interaction.reply({ embeds });
      } catch (err) {
        console.error('[Extract Command Error]', err);
        const embed = new EmbedBuilder()
          .setColor('#EF4444')
          .setDescription(`${errorIcon} Failed to extract emojis: ${err.message}`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }

    // 1.3 Ticket Command (/ticket setup, /ticket config)
    if (commandName === 'ticket') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        const embed = new EmbedBuilder()
          .setColor('#EF4444')
          .setDescription(`${getCustomEmoji('nexus_cross') || '❌'} **Access Denied**: You require \`ManageGuild\` or \`Administrator\` permission to manage ticket panels.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const subcommand = interaction.options.getSubcommand(false) || 'setup';

      if (subcommand === 'setup') {
        const sessionId = createTicketSetupSession({ userId: interaction.user.id, guildId: interaction.guildId });
        const view = getTicketSetupBuilderViewAndComponents(sessionId, interaction.guild);
        return interaction.reply({ embeds: view.embeds, components: view.components, ephemeral: true });
      }

      if (subcommand === 'config') {
        const guildSettings = getGuildSettings(interaction.guildId);
        const ticketConfig = guildSettings.tickets || {};

        const embed = new EmbedBuilder()
          .setColor('#5865F2')
          .setTitle(`${getCustomEmoji('nexus_ticket') || '🎫'} Ticket System Configuration`)
          .setDescription(ticketConfig.enabled ? 'Ticket system module is active and configured.' : 'No active ticket configuration found or setup is pending.')
          .addFields(
            { name: 'Panel Title', value: `\`${ticketConfig.panelTitle || 'Default Support Ticket Panel'}\``, inline: true },
            { name: 'Target Category ID', value: ticketConfig.categoryId ? `<#${ticketConfig.categoryId}>` : '`Auto-Category`', inline: true },
            { name: 'Configured Buttons', value: `\`${ticketConfig.buttons ? ticketConfig.buttons.length : 2}\` active category buttons`, inline: true },
            { name: 'Welcome Message', value: `\`\`\`${ticketConfig.welcomeMessage || 'Default welcome message'}\`\`\`` }
          )
          .setFooter({ text: 'Click "Edit Ticket Configuration" below to customize panel embed, buttons, and welcome message.' })
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`tkt_btn_config_edit_${interaction.guildId}`)
            .setLabel('Edit Ticket Configuration')
            .setEmoji(resolveEmojiObject('nexus_settings', 'settings'))
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`tkt_btn_config_deploy_new_${interaction.guildId}`)
            .setLabel('Deploy New Panel')
            .setEmoji(resolveEmojiObject('nexus_tick', 'tick'))
            .setStyle(ButtonStyle.Success)
        );

        return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      }
    }

    // 1.5 General Activity Logs / Activity Command
    if (commandName === 'logs' || commandName === 'activity') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        const embed = new EmbedBuilder()
          .setColor('#EF4444')
          .setDescription(`${errorIcon} **Access Denied**: You require \`ManageGuild\` permission.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const channel = interaction.options.getChannel('channel');
      if (!channel) {
        const embed = new EmbedBuilder()
          .setColor('#EF4444')
          .setDescription(`${errorIcon} Please specify a valid channel.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (!settings.logging) settings.logging = { enabled: true, logChannelId: '' };
      settings.logging.logChannelId = channel.id;
      settings.logging.enabled = true;
      saveGuildSettings(guildId, settings);

      addGuildAudit(guildId, 'logs', 'LOG_CHANNEL_UPDATED', `Activity log channel updated to #${channel.name} (${channel.id})`, user.tag);

      const logsIcon = statusEmoji('logs') || statusEmoji('channel') || getEmoji('nexus_logs') || '📜';

      const embed = new EmbedBuilder()
        .setTitle(`${logsIcon} Activity Log Channel Configured`)
        .setColor('#5865F2')
        .setDescription(`General Discord activity logs (channel edits, category edits, role updates, member events, message edits/deletes) will now be sent to <#${channel.id}>.`)
        .addFields(
          { name: 'Selected Channel', value: `<#${channel.id}> (\`${channel.id}\`)`, inline: true },
          { name: 'Status', value: `${successIcon} Active`, inline: true }
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // 2. AutoMod Command Group
    if (commandName === 'automod') {
      const targetChannel = interaction.options.getChannel('channel');

      if (targetChannel) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
          const embed = new EmbedBuilder()
            .setColor('#EF4444')
            .setDescription(`${errorIcon} **Access Denied**: You require \`ManageGuild\` permission.`);
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        settings.automod.logChannelId = targetChannel.id;
        settings.automod.enabled = true;
        saveGuildSettings(guildId, settings);

        addGuildAudit(guildId, 'automod', 'LOG_CHANNEL_UPDATED', `AutoMod log channel updated to #${targetChannel.name} (${targetChannel.id})`, user.tag);

        const embed = new EmbedBuilder()
          .setTitle(`${automodIcon} AutoMod Log Channel Configured`)
          .setColor('#3B82F6')
          .setDescription(`All AutoMod security violation logs will now be sent to <#${targetChannel.id}>.`)
          .addFields(
            { name: 'Selected Channel', value: `<#${targetChannel.id}> (\`${targetChannel.id}\`)`, inline: true },
            { name: 'AutoMod Status', value: settings.automod.enabled ? `${successIcon} Active` : `${errorIcon} Disabled`, inline: true }
          )
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      let subcommand = null;
      try { subcommand = interaction.options.getSubcommand(); } catch (e) {}

      if (subcommand === 'status') {
        const statusEmbed = new EmbedBuilder()
          .setTitle(`${automodIcon} AutoMod Shield Configuration`)
          .setColor('#3B82F6')
          .addFields(
            { name: 'Shield Status', value: settings.automod.enabled ? `${successIcon} **ACTIVE**` : `${errorIcon} **DISABLED**`, inline: true },
            { name: 'Log Channel', value: settings.automod.logChannelId ? `<#${settings.automod.logChannelId}>` : '*Not Set*', inline: true },
            { name: 'Spam Filter', value: settings.automod.spamFilter ? `${successIcon} Enabled` : `${errorIcon} Disabled`, inline: true },
            { name: 'Duplicate Filter', value: settings.automod.duplicateFilter ? `${successIcon} Enabled` : `${errorIcon} Disabled`, inline: true },
            { name: 'Link Filtering', value: settings.automod.linkFilter ? `${successIcon} Enabled` : `${errorIcon} Disabled`, inline: true },
            { name: 'Invite Filtering', value: settings.automod.inviteFilter ? `${successIcon} Enabled` : `${errorIcon} Disabled`, inline: true },
            { name: 'Penalty Action', value: `\`${settings.automod.action || 'delete'}\``, inline: true }
          )
          .setFooter({ text: 'Realtime updates synchronized with Nexus Dashboard' })
          .setTimestamp();

        return interaction.reply({ embeds: [statusEmbed] });
      }

      if (subcommand === 'toggle') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
          const embed = new EmbedBuilder()
            .setColor('#EF4444')
            .setDescription(`${errorIcon} **Access Denied**: You require \`ManageGuild\` permission.`);
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const enabled = interaction.options.getBoolean('enabled');
        settings.automod.enabled = enabled;
        saveGuildSettings(guildId, settings);

        addGuildAudit(guildId, 'automod', enabled ? 'SHIELD_ENABLED' : 'SHIELD_DISABLED', `AutoMod protection shield toggled ${enabled ? 'ON' : 'OFF'} via Discord command`, user.tag);

        const embed = new EmbedBuilder()
          .setColor(enabled ? '#10B981' : '#EF4444')
          .setDescription(`${enabled ? successIcon : errorIcon} **AutoMod** protection shield has been successfully toggled **${enabled ? 'ON' : 'OFF'}**.`);

        return interaction.reply({ embeds: [embed] });
      }

      const defaultEmbed = new EmbedBuilder()
        .setTitle(`${automodIcon} AutoMod Configuration`)
        .setColor('#3B82F6')
        .setDescription(`AutoMod log channel is currently: ${settings.automod.logChannelId ? `<#${settings.automod.logChannelId}>` : '*Not configured*'}\n\nTo set log channel, run: \`/automod log channel:#channel\``);
      return interaction.reply({ embeds: [defaultEmbed] });
    }

    // 3. AntiRaid Command Group
    if (commandName === 'antiraid') {
      const targetChannel = interaction.options.getChannel('channel');

      if (targetChannel) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
          const embed = new EmbedBuilder()
            .setColor('#EF4444')
            .setDescription(`${errorIcon} **Access Denied**: You require \`ManageGuild\` permission.`);
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        settings.antiraid.logChannelId = targetChannel.id;
        settings.antiraid.enabled = true;
        saveGuildSettings(guildId, settings);

        addGuildAudit(guildId, 'antiraid', 'LOG_CHANNEL_UPDATED', `AntiRaid log channel updated to #${targetChannel.name} (${targetChannel.id})`, user.tag);

        const embed = new EmbedBuilder()
          .setTitle(`${raidIcon} AntiRaid Log Channel Configured`)
          .setColor('#EF4444')
          .setDescription(`All AntiRaid threat detection alerts will now be sent to <#${targetChannel.id}>.`)
          .addFields(
            { name: 'Selected Channel', value: `<#${targetChannel.id}> (\`${targetChannel.id}\`)`, inline: true },
            { name: 'AntiRaid Status', value: settings.antiraid.enabled ? `${successIcon} Active` : `${errorIcon} Disabled`, inline: true }
          )
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      let subcommand = null;
      try { subcommand = interaction.options.getSubcommand(); } catch (e) {}

      if (subcommand === 'status') {
        const statusEmbed = new EmbedBuilder()
          .setTitle(`${raidIcon} AntiRaid Defense Status`)
          .setColor('#EF4444')
          .addFields(
            { name: 'Defense Shield', value: settings.antiraid.enabled ? `${successIcon} **ACTIVE**` : `${errorIcon} **DISABLED**`, inline: true },
            { name: 'Log Channel', value: settings.antiraid.logChannelId ? `<#${settings.antiraid.logChannelId}>` : '*Not Set*', inline: true },
            { name: 'Burst Threshold', value: `\`${settings.antiraid.joinThreshold || 10} joins / ${settings.antiraid.joinWindow || 10}s\``, inline: true },
            { name: 'Min Account Age', value: `\`${settings.antiraid.minAccountAge || 1} day(s)\``, inline: true },
            { name: 'Auto Quarantine', value: settings.antiraid.quarantineNewAccounts ? `${successIcon} Enabled` : `${errorIcon} Disabled`, inline: true }
          )
          .setFooter({ text: 'Active protection monitoring incoming server joins' })
          .setTimestamp();

        return interaction.reply({ embeds: [statusEmbed] });
      }

      const defaultEmbed = new EmbedBuilder()
        .setTitle(`${raidIcon} AntiRaid System`)
        .setColor('#EF4444')
        .setDescription(`AntiRaid log channel is currently: ${settings.antiraid.logChannelId ? `<#${settings.antiraid.logChannelId}>` : '*Not configured*'}\n\nTo set log channel, run: \`/antiraid log channel:#channel\``);
      return interaction.reply({ embeds: [defaultEmbed] });
    }

    // 4. AntiNuke Command Group
    if (commandName === 'antinuke') {
      const targetChannel = interaction.options.getChannel('channel');

      if (targetChannel) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          const embed = new EmbedBuilder()
            .setColor('#EF4444')
            .setDescription(`${errorIcon} **Access Denied**: AntiNuke configs require \`Administrator\` permission.`);
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        settings.antinuke.logChannelId = targetChannel.id;
        settings.antinuke.enabled = true;
        saveGuildSettings(guildId, settings);

        addGuildAudit(guildId, 'antinuke', 'LOG_CHANNEL_UPDATED', `AntiNuke log channel updated to #${targetChannel.name} (${targetChannel.id})`, user.tag);

        const embed = new EmbedBuilder()
          .setTitle(`${nukeIcon} AntiNuke Log Channel Configured`)
          .setColor('#F59E0B')
          .setDescription(`All AntiNuke protection alerts will now be sent to <#${targetChannel.id}>.`)
          .addFields(
            { name: 'Selected Channel', value: `<#${targetChannel.id}> (\`${targetChannel.id}\`)`, inline: true },
            { name: 'AntiNuke Status', value: settings.antinuke.enabled ? `${successIcon} Active` : `${errorIcon} Disabled`, inline: true }
          )
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      let subcommand = null;
      try { subcommand = interaction.options.getSubcommand(); } catch (e) {}

      if (subcommand === 'status') {
        const statusEmbed = new EmbedBuilder()
          .setTitle(`${nukeIcon} AntiNuke Guard Configuration`)
          .setColor('#F59E0B')
          .addFields(
            { name: 'Guard Status', value: settings.antinuke.enabled ? `${successIcon} **ACTIVE**` : `${errorIcon} **DISABLED**`, inline: true },
            { name: 'Log Channel', value: settings.antinuke.logChannelId ? `<#${settings.antinuke.logChannelId}>` : '*Not Set*', inline: true },
            { name: 'Channel Deletion Limit', value: `\`${settings.antinuke.channelDeleteThreshold || 3} deletes / min\``, inline: true },
            { name: 'Channel Creation Limit', value: `\`${settings.antinuke.channelCreateThreshold || 3} creates / min\``, inline: true },
            { name: 'Role Deletion Limit', value: `\`${settings.antinuke.roleDeleteThreshold || 3} deletes / min\``, inline: true },
            { name: 'Penalty Action', value: `\`${settings.antinuke.action || 'remove_roles'}\``, inline: true }
          )
          .setFooter({ text: 'Preventing rogue administrator/moderator account exploits' })
          .setTimestamp();

        return interaction.reply({ embeds: [statusEmbed] });
      }

      if (subcommand === 'toggle') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          const embed = new EmbedBuilder()
            .setColor('#EF4444')
            .setDescription(`${errorIcon} **Access Denied**: AntiNuke configs require \`Administrator\` permission.`);
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const enabled = interaction.options.getBoolean('enabled');
        settings.antinuke.enabled = enabled;
        saveGuildSettings(guildId, settings);

        addGuildAudit(guildId, 'antinuke', enabled ? 'GUARD_ENABLED' : 'GUARD_DISABLED', `AntiNuke security guard toggled ${enabled ? 'ON' : 'OFF'} via Discord command`, user.tag);

        const embed = new EmbedBuilder()
          .setColor(enabled ? '#10B981' : '#EF4444')
          .setDescription(`${enabled ? successIcon : errorIcon} **AntiNuke** security guard has been successfully toggled **${enabled ? 'ON' : 'OFF'}**.`);

        return interaction.reply({ embeds: [embed] });
      }

      const defaultEmbed = new EmbedBuilder()
        .setTitle(`${nukeIcon} AntiNuke System`)
        .setColor('#F59E0B')
        .setDescription(`AntiNuke log channel is currently: ${settings.antinuke.logChannelId ? `<#${settings.antinuke.logChannelId}>` : '*Not configured*'}\n\nTo set log channel, run: \`/antinuke log channel:#channel\``);
      return interaction.reply({ embeds: [defaultEmbed] });
    }

    // 5. Direct Message (DM) & Embed Commands
    if (commandName === 'embed') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: You require \`ManageMessages\` permission.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const sessionId = createChannelEmbedSession({
        userId: interaction.user.id,
        guildId: interaction.guildId
      });

      const { embeds, components } = getChannelEmbedBuilderViewAndComponents(sessionId);
      return interaction.reply({ embeds, components, ephemeral: true });
    }

    if (commandName === 'dm') {
      if (!settings.dms?.enabled) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Direct messaging commands are currently disabled in this server via the dashboard settings.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      if (!settings.dms?.allowDmCommand) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} The \`/dm\` command is currently disabled in this server via the dashboard settings.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: You require \`ManageMessages\` permission.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const targetUser = interaction.options.getUser('user');
      if (!targetUser) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Please specify a valid target user.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const sessionId = createDmSession({
        userId: interaction.user.id,
        guildId: interaction.guildId,
        commandName: 'dm',
        targetUser
      });

      const { embeds, components } = getInitialDmDispatchEmbedAndComponents(sessionId);
      return interaction.reply({ embeds, components, ephemeral: true });
    }

    if (commandName === 'dmroll') {
      if (!settings.dms?.enabled) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Direct messaging commands are currently disabled in this server via the dashboard settings.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      if (!settings.dms?.allowDmRollCommand) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} The \`/dmroll\` command is currently disabled in this server via the dashboard settings.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: You require \`ManageGuild\` permission.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const messageContent = interaction.options.getString('message');
      const targetRole = interaction.options.getRole('role');
      const titleInput = interaction.options.getString('title');
      const colorInput = interaction.options.getString('color');
      const thumbnailInput = interaction.options.getString('thumbnail');
      const imageInput = interaction.options.getString('image');
      const footerInput = interaction.options.getString('footer');
      const useEmbedOption = interaction.options.getBoolean('embed');

      const shouldEmbed = useEmbedOption !== false;

      await interaction.deferReply({ ephemeral: true });

      try {
        const members = await interaction.guild.members.fetch();
        let pool = members.filter(m => !m.user.bot);
        if (targetRole) {
          pool = pool.filter(m => m.roles.cache.has(targetRole.id));
        }

        if (pool.size === 0) {
          const respEmbed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} No eligible members found to DM.`);
          return interaction.editReply({ embeds: [respEmbed] });
        }

        const randomMember = pool.random();

        if (shouldEmbed) {
          const dmEmbed = buildCustomDmEmbed({
            title: titleInput,
            message: messageContent,
            color: colorInput,
            thumbnail: thumbnailInput,
            image: imageInput,
            footer: footerInput
          });
          await randomMember.send({ embeds: [dmEmbed] });
        } else {
          await randomMember.send({ content: messageContent });
        }

        addGuildAudit(guildId, 'direct-messages', 'DMROLL_COMMAND_SEND', `Sent random DM to ${randomMember.user.tag} (Role filter: ${targetRole ? targetRole.name : 'None'}). Content: ${messageContent}`, interaction.user.tag);

        const respEmbed = new EmbedBuilder()
          .setTitle(`${statusEmoji('cup') || '🎲'} Random DM Roll Winner`)
          .setColor('#10B981')
          .setDescription(`Successfully selected a member at random and dispatched the direct message.`)
          .addFields(
            { name: `${statusEmoji('user') || '👤'} Winner`, value: `<@${randomMember.id}> (**${randomMember.user.tag}**)`, inline: true },
            { name: `${statusEmoji('settings') || '🏷️'} Role Filter`, value: targetRole ? `<@&${targetRole.id}>` : '`None (All Members)`', inline: true },
            { name: `${statusEmoji('message') || '✉️'} Format`, value: shouldEmbed ? '`Rich Embed`' : '`Plain Text`', inline: true },
            { name: `${statusEmoji('info') || '📝'} Content Preview`, value: messageContent.length > 300 ? messageContent.slice(0, 297) + '...' : messageContent }
          )
          .setFooter({ text: `Nexus Random DM Dispatcher` })
          .setTimestamp();
        return interaction.editReply({ embeds: [respEmbed] });
      } catch (err) {
        console.error('[Slash DmRoll Command Error]', err);
        const respEmbed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Failed to execute DM Roll: ${err.message}`);
        return interaction.editReply({ embeds: [respEmbed] });
      }
    }

    if (commandName === 'dmglobal') {
      if (!settings.dms?.enabled) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Direct messaging commands are currently disabled in this server via the dashboard settings.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      if (!settings.dms?.allowDmGlobalCommand) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} The \`/dmglobal\` command is currently disabled in this server via the dashboard settings.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: You require \`Administrator\` permission to broadcast global DMs.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const targetRole = interaction.options.getRole('role');

      const sessionId = createDmSession({
        userId: interaction.user.id,
        guildId: interaction.guildId,
        commandName: 'dmglobal',
        targetRole
      });

      const { embeds, components } = getInitialDmDispatchEmbedAndComponents(sessionId);
      return interaction.reply({ embeds, components, ephemeral: true });
    }

    // 6. Manual warn command
    if (commandName === 'warn') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: You require \`ManageMessages\` permission.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const targetUser = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');

      if (targetUser.bot) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} You cannot warn bots.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      await interaction.deferReply();

      const warnResult = await issueWarning({
        guild: interaction.guild,
        targetUser,
        reason,
        source: 'manual',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag
      });

      const embed = new EmbedBuilder()
        .setTitle(`${warnIcon} Member Warning Issued`)
        .setDescription(`Formally warned <@${targetUser.id}>.`)
        .setColor('#F59E0B')
        .addFields(
          { name: 'Reason', value: `\`${reason}\``, inline: true },
          { name: 'Case ID', value: `\`${warnResult.caseId}\``, inline: true },
          { name: 'Active Warnings', value: `\`${warnResult.activeCount}\``, inline: true }
        )
        .setTimestamp();

      if (warnResult.punishmentTriggered && warnResult.punishmentMessage) {
        embed.addFields({ name: 'Punishment Result', value: `<@${targetUser.id}> ${warnResult.punishmentMessage}` });
      }

      return interaction.editReply({ embeds: [embed] });
    }

    // 7. Warnings lookup command
    if (commandName === 'warnings') {
      const targetUser = interaction.options.getUser('user') || interaction.user;
      
      if (targetUser.id !== interaction.user.id && !interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: You require \`ManageMessages\` to query warnings of other users.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      await interaction.deferReply();

      const warningsPath = path.join(DATA_DIR, guildId, 'warnings.json');
      let warnings = [];
      try { warnings = JSON.parse(fs.readFileSync(warningsPath, 'utf8')); } catch (e) {}

      const userWarns = warnings.filter(w => w.memberId === targetUser.id);
      const activeWarns = userWarns.filter(w => w.active !== false);

      const embed = new EmbedBuilder()
        .setTitle(`Warning History for ${targetUser.tag}`)
        .setColor('#5865F2')
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: 'Total Warnings Received', value: `\`${userWarns.length}\``, inline: true },
          { name: 'Active Warnings Count', value: `\`${activeWarns.length}\``, inline: true }
        );

      if (activeWarns.length === 0) {
        embed.setDescription('✨ **Clean Record**: This user has no active warnings in this server.');
      } else {
        const listText = activeWarns.slice(-10).map((w, idx) => {
          return `**${idx + 1}.** Case \`${w.caseId}\` • **${w.reason}**\n*Warned by <@${w.executorId}> on ${w.createdAt}*`;
        }).join('\n\n');
        embed.setDescription(`Showing up to 10 recent active warnings:\n\n${listText}`);
      }

      return interaction.editReply({ embeds: [embed] });
    }

    // 8. Clearwarns command
    if (commandName === 'clearwarns') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: You require \`ManageMessages\` permission to clear warnings.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const targetUser = interaction.options.getUser('user');
      const caseIdInput = interaction.options.getString('case_id');

      await interaction.deferReply();

      const warningsPath = path.join(DATA_DIR, guildId, 'warnings.json');
      let warnings = [];
      try { warnings = JSON.parse(fs.readFileSync(warningsPath, 'utf8')); } catch (e) {}

      let clearedCount = 0;
      if (caseIdInput) {
        const targetCase = caseIdInput.toUpperCase().trim();
        warnings = warnings.map(w => {
          if (w.memberId === targetUser.id && w.caseId === targetCase && w.active !== false) {
            w.active = false;
            clearedCount++;
          }
          return w;
        });
      } else {
        warnings = warnings.map(w => {
          if (w.memberId === targetUser.id && w.active !== false) {
            w.active = false;
            clearedCount++;
          }
          return w;
        });
      }

      if (clearedCount > 0) {
        fs.writeFileSync(warningsPath, JSON.stringify(warnings, null, 2));
        addGuildAudit(guildId, 'moderation', 'WARNINGS_CLEARED', `Cleared ${clearedCount} warnings for ${targetUser.tag}${caseIdInput ? ` (Case ${caseIdInput})` : ''}`, interaction.user.tag);
        
        const embed = new EmbedBuilder()
          .setColor('#10B981')
          .setDescription(`${successIcon} Successfully cleared **${clearedCount}** active warning(s) for <@${targetUser.id}>.`);
        return interaction.editReply({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setColor('#EF4444')
          .setDescription(`${errorIcon} No matching active warnings found to clear for <@${targetUser.id}>.`);
        return interaction.editReply({ embeds: [embed] });
      }
    }

    // 9. Lock command
    if (commandName === 'lock') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`ManageChannels\` required.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const reason = interaction.options.getString('reason') || 'Locked by administrator';

      const everyoneRole = interaction.guild.roles.everyone;
      const overwrite = channel.permissionOverwrites?.cache?.get(everyoneRole.id);
      const isAlreadyLocked = overwrite?.deny?.has(PermissionFlagsBits.SendMessages);

      if (isAlreadyLocked) {
        const embed = new EmbedBuilder()
          .setColor('#EF4444')
          .setDescription(`${errorIcon} Channel <#${channel.id}> is **already locked**.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      await interaction.deferReply();
      await channel.permissionOverwrites.edit(everyoneRole, { SendMessages: false }, { reason });
      addGuildAudit(guildId, 'moderation', 'CHANNEL_LOCK', `Locked channel #${channel.name}: ${reason}`, interaction.user.tag);
      
      const embed = new EmbedBuilder()
        .setTitle(`${lockIcon} Channel Locked`)
        .setColor('#EF4444')
        .setDescription(`Channel <#${channel.id}> has been **LOCKED**.`)
        .addFields(
          { name: `${statusEmoji('channel') || '📺'} Channel`, value: `<#${channel.id}>`, inline: true },
          { name: `${statusEmoji('info') || '📝'} Reason`, value: `\`${reason}\``, inline: true }
        )
        .setTimestamp();
      return interaction.editReply({ embeds: [embed] });
    }

    // 10. Unlock command
    if (commandName === 'unlock') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`ManageChannels\` required.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const reason = interaction.options.getString('reason') || 'Unlocked by administrator';

      const everyoneRole = interaction.guild.roles.everyone;
      const overwrite = channel.permissionOverwrites?.cache?.get(everyoneRole.id);
      const isLocked = overwrite?.deny?.has(PermissionFlagsBits.SendMessages);

      if (!isLocked) {
        const embed = new EmbedBuilder()
          .setColor('#EF4444')
          .setDescription(`${errorIcon} Channel <#${channel.id}> is **already unlocked**.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      await interaction.deferReply();
      await channel.permissionOverwrites.edit(everyoneRole, { SendMessages: null }, { reason });
      addGuildAudit(guildId, 'moderation', 'CHANNEL_UNLOCK', `Unlocked channel #${channel.name}: ${reason}`, interaction.user.tag);
      
      const embed = new EmbedBuilder()
        .setTitle(`${unlockIcon} Channel Unlocked`)
        .setColor('#10B981')
        .setDescription(`Channel <#${channel.id}> has been **UNLOCKED**.`)
        .addFields(
          { name: `${statusEmoji('channel') || '📺'} Channel`, value: `<#${channel.id}>`, inline: true },
          { name: `${statusEmoji('info') || '📝'} Reason`, value: `\`${reason}\``, inline: true }
        )
        .setTimestamp();
      return interaction.editReply({ embeds: [embed] });
    }

    // 11. LockAll command
    if (commandName === 'lockall') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: You require \`ManageChannels\` or \`Administrator\` permission.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      await interaction.deferReply();
      const reason = interaction.options.getString('reason') || 'Locked all channels by administrator';

      try {
        const channels = await interaction.guild.channels.fetch();
        let count = 0;
        for (const [_, channel] of channels) {
          if (channel && channel.isTextBased() && channel.permissionOverwrites) {
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
              SendMessages: false
            }, { reason: `LockAll: ${reason} (By ${user.tag})` }).catch(() => {});
            count++;
          }
        }

        addGuildAudit(guildId, 'moderation', 'LOCKALL_EXECUTED', `Locked ${count} text channels: ${reason}`, user.tag);

        const embed = new EmbedBuilder()
          .setTitle(`${lockIcon} Server Channels Locked`)
          .setColor('#EF4444')
          .setDescription(`Locked **${count}** text channels across the server for \`@everyone\`.`)
          .addFields(
            { name: `${statusEmoji('channel') || '📺'} Channels Locked`, value: `\`${count}\``, inline: true },
            { name: `${statusEmoji('info') || '📝'} Reason`, value: `\`${reason}\``, inline: true },
            { name: `${statusEmoji('user') || '👤'} Executed By`, value: `<@${user.id}>`, inline: true }
          )
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Failed to lock channels: ${err.message}`);
        return interaction.editReply({ embeds: [embed] });
      }
    }

    // 12. UnlockAll command
    if (commandName === 'unlockall') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: You require \`ManageChannels\` or \`Administrator\` permission.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      await interaction.deferReply();
      const reason = interaction.options.getString('reason') || 'Unlocked all channels by administrator';

      try {
        const channels = await interaction.guild.channels.fetch();
        let count = 0;
        for (const [_, channel] of channels) {
          if (channel && channel.isTextBased() && channel.permissionOverwrites) {
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
              SendMessages: null
            }, { reason: `UnlockAll: ${reason} (By ${user.tag})` }).catch(() => {});
            count++;
          }
        }

        addGuildAudit(guildId, 'moderation', 'UNLOCKALL_EXECUTED', `Unlocked ${count} text channels: ${reason}`, user.tag);

        const embed = new EmbedBuilder()
          .setTitle(`${unlockIcon} Server Channels Unlocked`)
          .setColor('#10B981')
          .setDescription(`Unlocked **${count}** text channels across the server for \`@everyone\`.`)
          .addFields(
            { name: `${statusEmoji('channel') || '📺'} Channels Unlocked`, value: `\`${count}\``, inline: true },
            { name: `${statusEmoji('info') || '📝'} Reason`, value: `\`${reason}\``, inline: true },
            { name: `${statusEmoji('user') || '👤'} Executed By`, value: `<@${user.id}>`, inline: true }
          )
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Failed to unlock channels: ${err.message}`);
        return interaction.editReply({ embeds: [embed] });
      }
    }

    // 13. Ban command
    if (commandName === 'ban') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`BanMembers\` required.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      const targetUser = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const deleteDays = interaction.options.getInteger('delete_messages') || 0;
      await interaction.deferReply();

      return handleActionConfirmation({
        interaction,
        actionTitle: `${banIcon} Confirm Member Ban`,
        actionPrompt: `Are you sure you want to permanently ban **${targetUser.tag}** (\`${targetUser.id}\`) from this server?`,
        targetUser,
        actionType: 'ban',
        fields: [
          { name: `${userIcon} Target User`, value: `<@${targetUser.id}>`, inline: true },
          { name: `${statusEmoji('info') || '📝'} Reason`, value: `\`${reason}\``, inline: true },
          { name: `${trashIcon} Delete Messages`, value: `\`${deleteDays} day(s)\``, inline: true }
        ],
        color: '#EF4444',
        onConfirm: async () => {
          await interaction.guild.members.ban(targetUser.id, { reason, deleteMessageSeconds: deleteDays * 86400 });
          addGuildAudit(guildId, 'moderation', 'MEMBER_BAN', `Banned ${targetUser.tag}: ${reason}`, interaction.user.tag);
          
          const embed = new EmbedBuilder()
            .setTitle(`${banIcon} Member Banned`)
            .setColor('#EF4444')
            .setDescription(`Permanently banned **${targetUser.tag}** (\`${targetUser.id}\`).`)
            .addFields(
              { name: `${userIcon} Target User`, value: `<@${targetUser.id}>`, inline: true },
              { name: `${statusEmoji('info') || '📝'} Reason`, value: `\`${reason}\``, inline: true },
              { name: `${trashIcon} Delete Days`, value: `\`${deleteDays} day(s)\``, inline: true }
            )
            .setTimestamp();

          await interaction.editReply({ embeds: [embed], components: [] });
        }
      });
    }

    // 14. Tempban command
    if (commandName === 'tempban') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`BanMembers\` required.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      const targetUser = interaction.options.getUser('user');
      const duration = interaction.options.getString('duration') || '1d';
      const reason = interaction.options.getString('reason') || 'Temporary ban';
      await interaction.deferReply();

      return handleActionConfirmation({
        interaction,
        actionTitle: `${banIcon} Confirm Temporary Ban`,
        actionPrompt: `Are you sure you want to temporarily ban **${targetUser.tag}** for \`${duration}\`?`,
        targetUser,
        actionType: 'ban',
        fields: [
          { name: `${userIcon} Target User`, value: `<@${targetUser.id}>`, inline: true },
          { name: `${statusEmoji('watch') || '🕒'} Duration`, value: `\`${duration}\``, inline: true },
          { name: `${statusEmoji('info') || '📝'} Reason`, value: `\`${reason}\``, inline: true }
        ],
        color: '#EF4444',
        onConfirm: async () => {
          await interaction.guild.members.ban(targetUser.id, { reason: `Tempban (${duration}): ${reason}` });
          addGuildAudit(guildId, 'moderation', 'MEMBER_TEMPBAN', `Tempbanned ${targetUser.tag} for ${duration}: ${reason}`, interaction.user.tag);
          
          const embed = new EmbedBuilder()
            .setTitle(`${banIcon} Temporary Ban Issued`)
            .setColor('#EF4444')
            .setDescription(`Temporarily banned **${targetUser.tag}** for \`${duration}\`.`)
            .addFields(
              { name: `${userIcon} Target User`, value: `<@${targetUser.id}>`, inline: true },
              { name: `${statusEmoji('watch') || '🕒'} Duration`, value: `\`${duration}\``, inline: true },
              { name: `${statusEmoji('info') || '📝'} Reason`, value: `\`${reason}\``, inline: true }
            )
            .setTimestamp();

          await interaction.editReply({ embeds: [embed], components: [] });
        }
      });
    }

    // 15. Softban command
    if (commandName === 'softban') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`BanMembers\` required.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      const targetUser = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'Softban';
      await interaction.deferReply();

      return handleActionConfirmation({
        interaction,
        actionTitle: `${banIcon} Confirm Softban`,
        actionPrompt: `Are you sure you want to softban **${targetUser.tag}** (kick and clear 7 days of messages)?`,
        targetUser,
        actionType: 'ban',
        fields: [
          { name: `${userIcon} Target User`, value: `<@${targetUser.id}>`, inline: true },
          { name: `${statusEmoji('info') || '📝'} Reason`, value: `\`${reason}\``, inline: true }
        ],
        color: '#F59E0B',
        onConfirm: async () => {
          await interaction.guild.members.ban(targetUser.id, { reason, deleteMessageSeconds: 7 * 86400 });
          await interaction.guild.members.unban(targetUser.id, 'Softban complete');
          addGuildAudit(guildId, 'moderation', 'MEMBER_SOFTBAN', `Softbanned ${targetUser.tag}: ${reason}`, interaction.user.tag);
          
          const embed = new EmbedBuilder()
            .setTitle(`${banIcon} Member Softbanned`)
            .setColor('#F59E0B')
            .setDescription(`Softbanned **${targetUser.tag}** (kicked user & cleared 7 days of messages).`)
            .addFields(
              { name: `${userIcon} Target User`, value: `<@${targetUser.id}>`, inline: true },
              { name: `${statusEmoji('info') || '📝'} Reason`, value: `\`${reason}\``, inline: true }
            )
            .setTimestamp();

          await interaction.editReply({ embeds: [embed], components: [] });
        }
      });
    }

    // 16. Unban command
    if (commandName === 'unban') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`BanMembers\` required.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      const userId = interaction.options.getString('user_id');
      const reason = interaction.options.getString('reason') || 'Unbanned by moderator';
      await interaction.deferReply();

      return handleActionConfirmation({
        interaction,
        actionTitle: `${unlockIcon} Confirm User Unban`,
        actionPrompt: `Are you sure you want to unban user ID **\`${userId}\`**?`,
        targetUser: null,
        actionType: 'unlock',
        fields: [
          { name: `${userIcon} Target User ID`, value: `\`${userId}\``, inline: true },
          { name: `${statusEmoji('info') || '📝'} Reason`, value: `\`${reason}\``, inline: true }
        ],
        color: '#10B981',
        onConfirm: async () => {
          await interaction.guild.members.unban(userId, reason);
          addGuildAudit(guildId, 'moderation', 'MEMBER_UNBAN', `Unbanned user ID ${userId}: ${reason}`, interaction.user.tag);
          
          const embed = new EmbedBuilder()
            .setTitle(`${unlockIcon} User Unbanned`)
            .setColor('#10B981')
            .setDescription(`Successfully unbanned user ID \`${userId}\`.`)
            .addFields({ name: `${statusEmoji('info') || '📝'} Reason`, value: `\`${reason}\``, inline: true })
            .setTimestamp();

          await interaction.editReply({ embeds: [embed], components: [] });
        }
      });
    }

    // 17. Kick command
    if (commandName === 'kick') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`KickMembers\` required.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      const targetUser = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      await interaction.deferReply();

      return handleActionConfirmation({
        interaction,
        actionTitle: `${kickIcon} Confirm Member Kick`,
        actionPrompt: `Are you sure you want to kick **${targetUser.tag}** (\`${targetUser.id}\`) from the server?`,
        targetUser,
        actionType: 'kick',
        fields: [
          { name: `${userIcon} Target User`, value: `<@${targetUser.id}>`, inline: true },
          { name: `${statusEmoji('info') || '📝'} Reason`, value: `\`${reason}\``, inline: true }
        ],
        color: '#F59E0B',
        onConfirm: async () => {
          const member = await interaction.guild.members.fetch(targetUser.id);
          await member.kick(reason);
          addGuildAudit(guildId, 'moderation', 'MEMBER_KICK', `Kicked ${targetUser.tag}: ${reason}`, interaction.user.tag);
          
          const embed = new EmbedBuilder()
            .setTitle(`${kickIcon} Member Kicked`)
            .setColor('#F59E0B')
            .setDescription(`Successfully kicked **${targetUser.tag}**.`)
            .addFields(
              { name: `${userIcon} Target User`, value: `<@${targetUser.id}>`, inline: true },
              { name: `${statusEmoji('info') || '📝'} Reason`, value: `\`${reason}\``, inline: true }
            )
            .setTimestamp();

          await interaction.editReply({ embeds: [embed], components: [] });
        }
      });
    }

    // 18. Mute command
    if (commandName === 'mute') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`ModerateMembers\` required.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      const targetUser = interaction.options.getUser('user');
      const durationStr = interaction.options.getString('duration') || '10m';
      const reason = interaction.options.getString('reason') || 'Timed out by moderator';
      await interaction.deferReply();

      let ms = 10 * 60 * 1000;
      if (durationStr.endsWith('m')) ms = parseInt(durationStr) * 60 * 1000;
      else if (durationStr.endsWith('h')) ms = parseInt(durationStr) * 60 * 60 * 1000;
      else if (durationStr.endsWith('d')) ms = parseInt(durationStr) * 24 * 60 * 60 * 1000;

      return handleActionConfirmation({
        interaction,
        actionTitle: `${timeoutIcon} Confirm Timeout / Mute`,
        actionPrompt: `Are you sure you want to timeout **${targetUser.tag}** for \`${durationStr}\`?`,
        targetUser,
        actionType: 'timeout',
        fields: [
          { name: `${userIcon} Target User`, value: `<@${targetUser.id}>`, inline: true },
          { name: `${statusEmoji('watch') || '🕒'} Duration`, value: `\`${durationStr}\``, inline: true },
          { name: `${statusEmoji('info') || '📝'} Reason`, value: `\`${reason}\``, inline: true }
        ],
        color: '#F59E0B',
        onConfirm: async () => {
          const member = await interaction.guild.members.fetch(targetUser.id);
          const botMember = interaction.guild.members.me;

          if (member.permissions.has(PermissionFlagsBits.Administrator) && botMember && member.roles.highest.position < botMember.roles.highest.position) {
            const adminRoles = member.roles.cache.filter(r => r.name !== '@everyone' && r.permissions.has(PermissionFlagsBits.Administrator));
            if (adminRoles.size > 0) {
              await member.roles.remove(adminRoles, 'Stripped Admin permission for timeout');
            }
          }

          await member.timeout(ms, reason);
          addGuildAudit(guildId, 'moderation', 'MEMBER_TIMEOUT', `Muted ${targetUser.tag} for ${durationStr}: ${reason}`, interaction.user.tag);
          
          const embed = new EmbedBuilder()
            .setTitle(`${successIcon} Member Timed Out`)
            .setColor('#F59E0B')
            .setDescription(`Muted <@${targetUser.id}> for \`${durationStr}\`.`)
            .addFields(
              { name: 'Duration', value: `\`${durationStr}\``, inline: true },
              { name: 'Reason', value: `\`${reason}\``, inline: true }
            )
            .setTimestamp();

          await interaction.editReply({ embeds: [embed], components: [] });
        }
      });
    }

    // 19. Unmute command
    if (commandName === 'unmute') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`ModerateMembers\` required.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      const targetUser = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'Timeout removed';
      await interaction.deferReply();
      try {
        const member = await interaction.guild.members.fetch(targetUser.id);
        await member.timeout(null, reason);
        addGuildAudit(guildId, 'moderation', 'MEMBER_UNMUTE', `Unmuted ${targetUser.tag}: ${reason}`, interaction.user.tag);
        
        const embed = new EmbedBuilder()
          .setTitle(`${successIcon} Timeout Removed`)
          .setColor('#10B981')
          .setDescription(`Removed active timeout for <@${targetUser.id}>.`)
          .addFields({ name: 'Reason', value: `\`${reason}\``, inline: true })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Failed to unmute member: ${err.message}`);
        return interaction.editReply({ embeds: [embed] });
      }
    }

    // 20. Purge command
    if (commandName === 'purge') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`ManageMessages\` required.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      const amount = interaction.options.getInteger('amount') || 10;
      const filter = interaction.options.getString('filter');
      await interaction.deferReply({ ephemeral: true });
      try {
        const fetched = await interaction.channel.messages.fetch({ limit: Math.min(amount, 100) });
        let toDelete = fetched;
        if (filter === 'bots') toDelete = fetched.filter(m => m.author.bot);
        else if (filter === 'links') toDelete = fetched.filter(m => /https?:\/\//i.test(m.content));
        else if (filter === 'embeds') toDelete = fetched.filter(m => m.embeds.length > 0);
        else if (filter === 'files') toDelete = fetched.filter(m => m.attachments.size > 0);

        const deleted = await interaction.channel.bulkDelete(toDelete, true);
        addGuildAudit(guildId, 'moderation', 'CHAT_PURGE', `Purged ${deleted.size} messages in #${interaction.channel.name}`, interaction.user.tag);

        const embed = new EmbedBuilder()
          .setTitle(`${trashIcon} Messages Purged`)
          .setColor('#3B82F6')
          .setDescription(`Successfully purged **${deleted.size}** message(s) from <#${interaction.channel.id}>.`)
          .addFields(
            { name: 'Purged Count', value: `\`${deleted.size}\``, inline: true },
            { name: 'Filter Applied', value: `\`${filter || 'None (All)'}\``, inline: true },
            { name: 'Executed By', value: `<@${interaction.user.id}>`, inline: true }
          )
          .setFooter({ text: 'This response will auto-delete in 5 seconds.' })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

        // Auto delete response after 4.5 seconds
        setTimeout(async () => {
          try {
            await interaction.deleteReply();
          } catch (e) {}
        }, 4500);

        return;
      } catch (err) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Bulk delete failed: ${err.message}`);
        return interaction.editReply({ embeds: [embed] });
      }
    }

    // 21. Slowmode command
    if (commandName === 'slowmode') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`ManageChannels\` required.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      const delay = interaction.options.getInteger('delay') ?? 0;
      const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
      await interaction.deferReply();
      try {
        await targetChannel.setRateLimitPerUser(delay);
        addGuildAudit(guildId, 'moderation', 'SLOWMODE', `Set slowmode to ${delay}s in #${targetChannel.name}`, interaction.user.tag);
        
        const embed = new EmbedBuilder()
          .setTitle(`${successIcon} Slowmode Configured`)
          .setColor('#3B82F6')
          .setDescription(`Set slowmode delay to **${delay} seconds** in <#${targetChannel.id}>.`)
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Failed to set slowmode: ${err.message}`);
        return interaction.editReply({ embeds: [embed] });
      }
    }

    // 22. Strip command
    if (commandName === 'strip') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: Administrator required.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      const targetUser = interaction.options.getUser('user');
      await interaction.deferReply();
      try {
        const member = await interaction.guild.members.fetch(targetUser.id);
        const adminRoles = member.roles.cache.filter(r => r.name !== '@everyone' && r.permissions.has(PermissionFlagsBits.Administrator));
        if (adminRoles.size > 0) {
          await member.roles.remove(adminRoles, 'Emergency strip via slash command');
          addGuildAudit(guildId, 'moderation', 'ADMIN_STRIP', `Stripped ${adminRoles.size} admin roles from ${targetUser.tag}`, interaction.user.tag);
          
          const embed = new EmbedBuilder()
            .setTitle(`${successIcon} Emergency Strip Complete`)
            .setColor('#10B981')
            .setDescription(`Stripped **${adminRoles.size}** Administrator role(s) from <@${targetUser.id}>.`);
          return interaction.editReply({ embeds: [embed] });
        } else {
          const embed = new EmbedBuilder().setColor('#3B82F6').setDescription(`${infoIcon} User <@${targetUser.id}> has no Administrator roles.`);
          return interaction.editReply({ embeds: [embed] });
        }
      } catch (err) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Failed to strip roles: ${err.message}`);
        return interaction.editReply({ embeds: [embed] });
      }
    }

    // 23. Quarantine command
    if (commandName === 'quarantine') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`ModerateMembers\` required.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      const targetUser = interaction.options.getUser('user');
      const active = interaction.options.getBoolean('active') ?? true;
      await interaction.deferReply();
      try {
        const member = await interaction.guild.members.fetch(targetUser.id);
        if (active) {
          await member.timeout(1000 * 60 * 60 * 24 * 7, 'Quarantined user');
          addGuildAudit(guildId, 'moderation', 'QUARANTINE_ON', `Quarantined ${targetUser.tag} for 7 days`, interaction.user.tag);
          
          const embed = new EmbedBuilder()
            .setTitle(`${lockIcon} Quarantine Activated`)
            .setColor('#EF4444')
            .setDescription(`Member <@${targetUser.id}> is now **QUARANTINED** for 7 days.`);
          return interaction.editReply({ embeds: [embed] });
        } else {
          await member.timeout(null, 'Quarantine removed');
          addGuildAudit(guildId, 'moderation', 'QUARANTINE_OFF', `Lifted quarantine for ${targetUser.tag}`, interaction.user.tag);
          
          const embed = new EmbedBuilder()
            .setTitle(`${successIcon} Quarantine Lifted`)
            .setColor('#10B981')
            .setDescription(`Quarantine lifted for <@${targetUser.id}>.`);
          return interaction.editReply({ embeds: [embed] });
        }
      } catch (err) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Quarantine toggle failed: ${err.message}`);
        return interaction.editReply({ embeds: [embed] });
      }
    }

    // 25. Modlogs command
    if (commandName === 'modlogs') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`ManageMessages\` required.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      const modUser = interaction.options.getUser('moderator') || interaction.user;
      await interaction.deferReply();

      const auditPath = path.join(DATA_DIR, guildId, 'audits.json');
      let audits = [];
      try { audits = JSON.parse(fs.readFileSync(auditPath, 'utf8')); } catch (e) {}

      const modLogs = audits.filter(a => a.executor?.toLowerCase().includes(modUser.username.toLowerCase()) || a.executor?.includes(modUser.id));

      const embed = new EmbedBuilder()
        .setTitle(`Moderator Action Logs: ${modUser.tag}`)
        .setColor('#5865F2')
        .setThumbnail(modUser.displayAvatarURL({ dynamic: true }))
        .setDescription(`Total Recorded Actions: **${modLogs.length}**`);

      if (modLogs.length > 0) {
        const logsList = modLogs.slice(-8).map((l, i) => `**${i + 1}.** [${l.action}] ${l.details}\n*${l.timestamp}*`).join('\n\n');
        embed.addFields({ name: 'Recent Actions', value: logsList });
      } else {
        embed.addFields({ name: 'Recent Actions', value: 'No moderator actions recorded.' });
      }

      return interaction.editReply({ embeds: [embed] });
    }

    // 26. Whitelist command
    if (commandName === 'whitelist') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: Administrator required.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      const action = interaction.options.getString('action');
      const targetUser = interaction.options.getUser('user');
      const targetRole = interaction.options.getRole('role');
      await interaction.deferReply();

      if (!settings.whitelist) settings.whitelist = { users: [], roles: [] };

      if (action === 'add') {
        if (targetUser && !settings.whitelist.users.includes(targetUser.id)) {
          settings.whitelist.users.push(targetUser.id);
        }
        if (targetRole && !settings.whitelist.roles.includes(targetRole.id)) {
          settings.whitelist.roles.push(targetRole.id);
        }
        saveGuildSettings(guildId, settings);
        
        const embed = new EmbedBuilder().setColor('#10B981').setDescription(`${successIcon} Added target to Whitelist.`);
        return interaction.editReply({ embeds: [embed] });
      } else {
        if (targetUser) {
          settings.whitelist.users = settings.whitelist.users.filter(id => id !== targetUser.id);
        }
        if (targetRole) {
          settings.whitelist.roles = settings.whitelist.roles.filter(id => id !== targetRole.id);
        }
        saveGuildSettings(guildId, settings);
        
        const embed = new EmbedBuilder().setColor('#10B981').setDescription(`${successIcon} Removed target from Whitelist.`);
        return interaction.editReply({ embeds: [embed] });
      }
    }

    // 27. Nick command
    if (commandName === 'nick') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`ManageNicknames\` permission required.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      const targetUser = interaction.options.getUser('user');
      const nickname = interaction.options.getString('nickname');
      const reason = interaction.options.getString('reason') || 'Nickname updated by moderator';

      await interaction.deferReply();
      try {
        const member = await interaction.guild.members.fetch(targetUser.id);
        const oldNick = member.nickname || member.user.username;
        await member.setNickname(nickname || null, reason);
        addGuildAudit(guildId, 'moderation', 'NICKNAME_CHANGE', `Changed ${targetUser.tag}'s nickname from "${oldNick}" to "${nickname || '[RESET]'}"`, interaction.user.tag);

        const embed = new EmbedBuilder()
          .setTitle(`${successIcon} Nickname Updated`)
          .setColor('#3B82F6')
          .setDescription(`Successfully updated nickname for <@${targetUser.id}>.`)
          .addFields(
            { name: `${userIcon} Target Member`, value: `<@${targetUser.id}>`, inline: true },
            { name: 'Old Name', value: `\`${oldNick}\``, inline: true },
            { name: 'New Name', value: `\`${nickname || '[Reset to Username]'}\``, inline: true },
            { name: 'Reason', value: `\`${reason}\``, inline: false }
          )
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Failed to update nickname: ${err.message}`);
        return interaction.editReply({ embeds: [embed] });
      }
    }

    // 28. Role command (add / remove)
    if (commandName === 'role') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`ManageRoles\` permission required.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      let subcommand = null;
      try { subcommand = interaction.options.getSubcommand(); } catch (e) {}

      const targetUser = interaction.options.getUser('user');
      const role = interaction.options.getRole('role');
      const reason = interaction.options.getString('reason') || 'Role updated by moderator';

      await interaction.deferReply();
      try {
        const member = await interaction.guild.members.fetch(targetUser.id);
        const botMember = interaction.guild.members.me;

        if (role.position >= botMember.roles.highest.position) {
          const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Cannot manage role <@&${role.id}>: Role is higher or equal to bot's highest role.`);
          return interaction.editReply({ embeds: [embed] });
        }

        if (subcommand === 'add') {
          await member.roles.add(role, reason);
          addGuildAudit(guildId, 'moderation', 'ROLE_ASSIGNED', `Assigned role ${role.name} to ${targetUser.tag}`, interaction.user.tag);

          const embed = new EmbedBuilder()
            .setTitle(`${successIcon} Role Assigned`)
            .setColor('#10B981')
            .setDescription(`Granted role <@&${role.id}> to <@${targetUser.id}>.`)
            .addFields(
              { name: 'Role', value: `<@&${role.id}> (\`${role.id}\`)`, inline: true },
              { name: 'Target Member', value: `<@${targetUser.id}>`, inline: true },
              { name: 'Reason', value: `\`${reason}\``, inline: false }
            )
            .setTimestamp();
          return interaction.editReply({ embeds: [embed] });
        } else {
          await member.roles.remove(role, reason);
          addGuildAudit(guildId, 'moderation', 'ROLE_REMOVED', `Removed role ${role.name} from ${targetUser.tag}`, interaction.user.tag);

          const embed = new EmbedBuilder()
            .setTitle(`${successIcon} Role Removed`)
            .setColor('#F59E0B')
            .setDescription(`Revoked role <@&${role.id}> from <@${targetUser.id}>.`)
            .addFields(
              { name: 'Role', value: `<@&${role.id}> (\`${role.id}\`)`, inline: true },
              { name: 'Target Member', value: `<@${targetUser.id}>`, inline: true },
              { name: 'Reason', value: `\`${reason}\``, inline: false }
            )
            .setTimestamp();
          return interaction.editReply({ embeds: [embed] });
        }
      } catch (err) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Failed to modify roles: ${err.message}`);
        return interaction.editReply({ embeds: [embed] });
      }
    }

    // 29. Userinfo command
    if (commandName === 'userinfo') {
      const targetUser = interaction.options.getUser('user') || interaction.user;
      await interaction.deferReply();

      try {
        const { embeds, components } = await getUserInfoEmbedAndComponents(interaction.guild, targetUser, 'general', interaction.user);
        return interaction.editReply({ embeds, components });
      } catch (err) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Failed to fetch member info: ${err.message}`);
        return interaction.editReply({ embeds: [embed] });
      }
    }

    // 30. Serverinfo command
    if (commandName === 'serverinfo') {
      await interaction.deferReply();
      try {
        const { embeds, components } = await getServerInfoEmbedAndComponents(interaction.guild, 'general', interaction.user);
        return interaction.editReply({ embeds, components });
      } catch (err) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Failed to fetch server info: ${err.message}`);
        return interaction.editReply({ embeds: [embed] });
      }
    }

    // 31. Massrole command
    if (commandName === 'massrole') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`Administrator\` permission required.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const action = interaction.options.getString('action');
      const targetGroup = interaction.options.getString('target');
      const role = interaction.options.getRole('role');
      const reason = interaction.options.getString('reason') || 'Mass role execution';

      await interaction.deferReply();
      try {
        const members = await interaction.guild.members.fetch();
        let affectedCount = 0;

        for (const [_, member] of members) {
          if (targetGroup === 'humans' && member.user.bot) continue;
          if (targetGroup === 'bots' && !member.user.bot) continue;

          if (action === 'add' && !member.roles.cache.has(role.id)) {
            await member.roles.add(role, reason).catch(() => {});
            affectedCount++;
          } else if (action === 'remove' && member.roles.cache.has(role.id)) {
            await member.roles.remove(role, reason).catch(() => {});
            affectedCount++;
          }
        }

        addGuildAudit(guildId, 'moderation', 'MASS_ROLE_EXECUTED', `Mass ${action} role ${role.name} to ${affectedCount} members (${targetGroup})`, interaction.user.tag);

        const embed = new EmbedBuilder()
          .setTitle(`${successIcon} Mass Role Action Complete`)
          .setColor('#10B981')
          .setDescription(`Successfully ${action === 'add' ? 'assigned' : 'removed'} role <@&${role.id}> for **${affectedCount}** members.`)
          .addFields(
            { name: 'Role', value: `<@&${role.id}>`, inline: true },
            { name: 'Target Group', value: `\`${targetGroup.toUpperCase()}\``, inline: true },
            { name: 'Affected Members', value: `\`${affectedCount}\``, inline: true }
          )
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Mass role failed: ${err.message}`);
        return interaction.editReply({ embeds: [embed] });
      }
    }

    // 32. Voice moderation commands (voicemute, voiceunmute, voicekick, deafen, undeafen)
    if (['voicemute', 'voiceunmute', 'voicekick', 'deafen', 'undeafen'].includes(commandName)) {
      const targetUser = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'Voice moderation action';

      await interaction.deferReply();
      try {
        const member = await interaction.guild.members.fetch(targetUser.id);
        if (!member.voice.channel) {
          const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} User <@${targetUser.id}> is not connected to any voice channel.`);
          return interaction.editReply({ embeds: [embed] });
        }

        if (commandName === 'voicemute') {
          if (!interaction.member.permissions.has(PermissionFlagsBits.MuteMembers)) {
            const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`MuteMembers\` permission required.`);
            return interaction.editReply({ embeds: [embed] });
          }
          await member.voice.setMute(true, reason);
          addGuildAudit(guildId, 'moderation', 'VOICE_MUTE', `Server voice muted ${targetUser.tag}`, interaction.user.tag);
          const embed = new EmbedBuilder().setTitle(`${successIcon} Voice Muted`).setColor('#F59E0B').setDescription(`Server muted <@${targetUser.id}> in voice.`).addFields({ name: 'Reason', value: `\`${reason}\`` });
          return interaction.editReply({ embeds: [embed] });
        }

        if (commandName === 'voiceunmute') {
          if (!interaction.member.permissions.has(PermissionFlagsBits.MuteMembers)) {
            const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`MuteMembers\` permission required.`);
            return interaction.editReply({ embeds: [embed] });
          }
          await member.voice.setMute(false, reason);
          addGuildAudit(guildId, 'moderation', 'VOICE_UNMUTE', `Server voice unmuted ${targetUser.tag}`, interaction.user.tag);
          const embed = new EmbedBuilder().setTitle(`${successIcon} Voice Mute Lifted`).setColor('#10B981').setDescription(`Server unmuted <@${targetUser.id}> in voice.`).addFields({ name: 'Reason', value: `\`${reason}\`` });
          return interaction.editReply({ embeds: [embed] });
        }

        if (commandName === 'voicekick') {
          if (!interaction.member.permissions.has(PermissionFlagsBits.MoveMembers)) {
            const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`MoveMembers\` permission required.`);
            return interaction.editReply({ embeds: [embed] });
          }
          await member.voice.disconnect(reason);
          addGuildAudit(guildId, 'moderation', 'VOICE_KICK', `Disconnected ${targetUser.tag} from voice channel`, interaction.user.tag);
          const embed = new EmbedBuilder().setTitle(`${successIcon} Voice Disconnected`).setColor('#F59E0B').setDescription(`Disconnected <@${targetUser.id}> from voice channel.`).addFields({ name: 'Reason', value: `\`${reason}\`` });
          return interaction.editReply({ embeds: [embed] });
        }

        if (commandName === 'deafen') {
          if (!interaction.member.permissions.has(PermissionFlagsBits.DeafenMembers)) {
            const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`DeafenMembers\` permission required.`);
            return interaction.editReply({ embeds: [embed] });
          }
          await member.voice.setDeaf(true, reason);
          addGuildAudit(guildId, 'moderation', 'VOICE_DEAFEN', `Server deafened ${targetUser.tag}`, interaction.user.tag);
          const embed = new EmbedBuilder().setTitle(`${successIcon} Member Deafened`).setColor('#F59E0B').setDescription(`Server deafened <@${targetUser.id}> in voice.`).addFields({ name: 'Reason', value: `\`${reason}\`` });
          return interaction.editReply({ embeds: [embed] });
        }

        if (commandName === 'undeafen') {
          if (!interaction.member.permissions.has(PermissionFlagsBits.DeafenMembers)) {
            const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`DeafenMembers\` permission required.`);
            return interaction.editReply({ embeds: [embed] });
          }
          await member.voice.setDeaf(false, reason);
          addGuildAudit(guildId, 'moderation', 'VOICE_UNDEAFEN', `Server undeafened ${targetUser.tag}`, interaction.user.tag);
          const embed = new EmbedBuilder().setTitle(`${successIcon} Deafen Lifted`).setColor('#10B981').setDescription(`Server undeafened <@${targetUser.id}> in voice.`).addFields({ name: 'Reason', value: `\`${reason}\`` });
          return interaction.editReply({ embeds: [embed] });
        }
      } catch (err) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Voice moderation action failed: ${err.message}`);
        return interaction.editReply({ embeds: [embed] });
      }
    }

    // 33. Extract Embed command
    if (commandName === 'extractembed') {
      await interaction.deferReply();
      const messageId = interaction.options.getString('message_id');
      let targetMessage = null;

      try {
        if (messageId) {
          targetMessage = await interaction.channel.messages.fetch(messageId).catch(() => null);
        } else {
          const recent = await interaction.channel.messages.fetch({ limit: 10 });
          targetMessage = recent.find(m => m.embeds && m.embeds.length > 0);
        }

        if (!targetMessage) {
          const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} No message with embeds found. Specify a valid message ID or run this command in a channel with embeds.`);
          return interaction.editReply({ embeds: [embed] });
        }

        if (!targetMessage.embeds || targetMessage.embeds.length === 0) {
          const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} No embeds found in the targeted message (\`${targetMessage.id}\`).`);
          return interaction.editReply({ embeds: [embed] });
        }

        const rawEmbeds = targetMessage.embeds.map(e => e.data || (e.toJSON ? e.toJSON() : e));
        const jsonContent = JSON.stringify(rawEmbeds.length === 1 ? rawEmbeds[0] : rawEmbeds, null, 2);

        if (jsonContent.length <= 1900) {
          return interaction.editReply({
            content: `📦 **Extracted Embed JSON** (from message \`${targetMessage.id}\`):\n\`\`\`json\n${jsonContent}\n\`\`\``
          });
        } else {
          const attachment = new AttachmentBuilder(Buffer.from(jsonContent, 'utf-8'), { name: 'embed.json' });
          return interaction.editReply({
            content: `📦 **Extracted Embed JSON** (Exceeds character limit, attached file for message \`${targetMessage.id}\`):`,
            files: [attachment]
          });
        }
      } catch (err) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Failed to extract embed: ${err.message}`);
        return interaction.editReply({ embeds: [embed] });
      }
    }

    // Catch-all safety check to ensure interaction is ALWAYS acknowledged
    if (!interaction.replied && !interaction.deferred) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Command \`/${commandName}\` acknowledged.`);
      await interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
    }
  } else if (interaction.isStringSelectMenu()) {
    const { customId, values } = interaction;
    if (customId === 'serverinfo_category_select') {
      const val = values[0]; // 'serverinfo_general', 'serverinfo_stats', 'serverinfo_roles'
      const category = val.replace('serverinfo_', '');
      const { embeds, components } = await getServerInfoEmbedAndComponents(interaction.guild, category, interaction.user);
      await interaction.update({ embeds, components });
      return;
    }
    if (customId.startsWith('userinfo_category_select_')) {
      const targetUserId = customId.replace('userinfo_category_select_', '');
      const val = values[0]; // e.g. 'userinfo_general_...', 'userinfo_roles_...', 'userinfo_avatar_...'
      let category = 'general';
      if (val.includes('roles')) category = 'roles';
      else if (val.includes('avatar')) category = 'avatar';

      const targetUser = await client.users.fetch(targetUserId).catch(() => null) || interaction.user;
      const { embeds, components } = await getUserInfoEmbedAndComponents(interaction.guild, targetUser, category, interaction.user);
      await interaction.update({ embeds, components });
      return;
    }
    if (customId === 'help_category_select') {
      const selectedCategory = values[0];
      const settings = interaction.guildId ? getGuildSettings(interaction.guildId) : {};
      const context = {
        client,
        guild: interaction.guild,
        user: interaction.user,
        prefix: settings.prefix || '!'
      };
      const { embeds, components } = getHelpEmbedAndComponents(selectedCategory, context);
      await interaction.update({ embeds, components });
      setHelpTimeout(interaction, selectedCategory, context);
      return;
    }
    if (customId.startsWith('dm_select_field_')) {
      const sessionId = customId.replace('dm_select_field_', '');
      const fieldName = values[0];
      const modal = createEmbedFieldModal(sessionId, fieldName);
      return interaction.showModal(modal);
    }
    if (customId.startsWith('chan_select_field_')) {
      const sessionId = customId.replace('chan_select_field_', '');
      const fieldName = values[0];
      const modal = createChannelEmbedFieldModal(sessionId, fieldName);
      return interaction.showModal(modal);
    }
    if (customId.startsWith('tkt_select_field_')) {
      const sessionId = customId.replace('tkt_select_field_', '');
      const fieldName = values[0];
      const session = getTicketSetupSession(sessionId, interaction.guildId, interaction.user.id);
      if (!session) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${getCustomEmoji('nexus_cross') || '❌'} Session expired or invalid.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const currentValue = session.panelData[fieldName] || '';
      const modal = createTicketFieldModal(sessionId, fieldName, currentValue);
      return interaction.showModal(modal);
    }
    if (customId.startsWith('tkt_step3_config_select_')) {
      const sessionId = customId.replace('tkt_step3_config_select_', '');
      const session = getTicketSetupSession(sessionId, interaction.guildId, interaction.user.id);
      if (!session) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${getCustomEmoji('nexus_cross') || '[Error]'} Session expired or invalid.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const selectedValue = values[0];
      if (selectedValue === 'welcome_msg') {
        const modal = createTicketFieldModal(sessionId, 'welcomeMessage', session.panelData.welcomeMessage);
        return interaction.showModal(modal);
      } else if (selectedValue === 'log_channel') {
        session.activeConfigField = 'log_channel';
        const view = getTicketSetupBuilderViewAndComponents(sessionId, interaction.guild);
        return interaction.update({ embeds: view.embeds, components: view.components });
      } else if (selectedValue === 'staff_role') {
        session.activeConfigField = 'staff_role';
        const view = getTicketSetupBuilderViewAndComponents(sessionId, interaction.guild);
        return interaction.update({ embeds: view.embeds, components: view.components });
      }
    }
    if (customId.startsWith('tkt_select_category_')) {
      const sessionId = customId.replace('tkt_select_category_', '');
      const session = getTicketSetupSession(sessionId, interaction.guildId, interaction.user.id);
      if (!session) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${getCustomEmoji('nexus_cross') || '❌'} Session expired or invalid.`);
        return interaction.update({ embeds: [embed], components: [] });
      }

      const categoryId = values[0];
      session.panelData.categoryId = categoryId === 'default' ? '' : categoryId;

      const view = getTicketSetupBuilderViewAndComponents(sessionId, interaction.guild);
      return interaction.update({ embeds: view.embeds, components: view.components });
    }
    if (customId.startsWith('tkt_select_component_category_')) {
      const sessionId = customId.replace('tkt_select_component_category_', '');
      const session = getTicketSetupSession(sessionId, interaction.guildId, interaction.user.id);
      if (!session) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${getCustomEmoji('nexus_cross') || '❌'} Session expired or invalid.`);
        return interaction.update({ embeds: [embed], components: [] });
      }

      const catId = values[0];
      let catName = 'Default Category';
      if (catId !== 'default' && interaction.guild) {
        const catChan = interaction.guild.channels.cache.get(catId);
        if (catChan) catName = catChan.name;
      }

      if (session.pendingComponent) {
        if (session.pendingComponent.type === 'button') {
          session.panelData.buttons.push({
            id: `btn_${Date.now()}`,
            label: session.pendingComponent.label,
            emoji: session.pendingComponent.emoji || 'nexus_ticket',
            categoryId: catId === 'default' ? '' : catId,
            categoryName: catName,
            style: 'Primary'
          });
        } else if (session.pendingComponent.type === 'menu_option') {
          session.panelData.menuOptions.push({
            id: `opt_${Date.now()}`,
            label: session.pendingComponent.label,
            description: session.pendingComponent.desc || '',
            emoji: session.pendingComponent.emoji || 'nexus_ticket',
            categoryId: catId === 'default' ? '' : catId,
            categoryName: catName
          });
        }
        session.pendingComponent = null;
      }

      session.step = 2;
      const view = getTicketSetupBuilderViewAndComponents(sessionId, interaction.guild);
      return interaction.update({ embeds: view.embeds, components: view.components });
    }
    if (customId.startsWith('tkt_panel_dropdown_select_')) {
      const guildSettings = getGuildSettings(interaction.guildId);
      const ticketConfig = guildSettings.tickets || {};
      const selectedOptionId = values[0];
      const selectedOpt = (ticketConfig.menuOptions || []).find(o => o.id === selectedOptionId) || { label: 'Support Request' };

      let counter = (ticketConfig.counter || 0) + 1;
      ticketConfig.counter = counter;
      guildSettings.tickets = ticketConfig;
      saveGuildSettings(interaction.guildId, guildSettings);

      const cleanUserName = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
      const channelName = `${cleanUserName}-ticket-${counter}`;
      let parentCategoryId = selectedOpt.categoryId || ticketConfig.categoryId;

      try {
        const ticketChannel = await interaction.guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: parentCategoryId || undefined,
          permissionOverwrites: [
            { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory] },
            { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
          ]
        });

        if (ticketConfig.staffRoleId) {
          ticketChannel.permissionOverwrites.edit(ticketConfig.staffRoleId, {
            ViewChannel: true, SendMessages: true, ManageChannels: true
          }).catch(() => {});
        }

        const rawWelcome = ticketConfig.welcomeMessage || 'Welcome {user}! Thank you for contacting support. Our staff team will assist you shortly.';
        const welcomeText = rawWelcome.replace(/\{user\}/g, `<@${interaction.user.id}>`);

        const welcomeEmbed = new EmbedBuilder()
          .setColor('#5865F2')
          .setTitle(`${getCustomEmoji('nexus_ticket') || '[Ticket]'} Ticket Opened: ${selectedOpt.label}`)
          .setDescription(welcomeText)
          .addFields(
            { name: 'Ticket Ref', value: `\`#${counter}\``, inline: true },
            { name: 'Opened By', value: `<@${interaction.user.id}>`, inline: true }
          )
          .setFooter({ text: 'Support Ticket Automation System' })
          .setTimestamp();

        const actionRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('tkt_act_claim').setLabel('Claim Ticket').setStyle(ButtonStyle.Primary).setEmoji(resolveEmojiObject('nexus_createticket', 'createticket')),
          new ButtonBuilder().setCustomId('tkt_act_close').setLabel('Close Ticket').setStyle(ButtonStyle.Secondary).setEmoji(resolveEmojiObject('nexus_ticket', 'ticket')),
          new ButtonBuilder().setCustomId('tkt_act_delete').setLabel('Delete Ticket').setStyle(ButtonStyle.Danger).setEmoji(resolveEmojiObject('nexus_cross', 'cross'))
        );

        await ticketChannel.send({ content: `<@${interaction.user.id}>`, embeds: [welcomeEmbed], components: [actionRow] });

        if (ticketConfig.logChannelId) {
          const logChan = interaction.guild.channels.cache.get(ticketConfig.logChannelId);
          if (logChan) {
            const logEmbed = new EmbedBuilder()
              .setColor('#3B82F6')
              .setTitle('[Ticket] Ticket Created')
              .setDescription(`Ticket <#${ticketChannel.id}> opened by <@${interaction.user.id}> for **${selectedOpt.label}**.`);
            logChan.send({ embeds: [logEmbed] }).catch(() => {});
          }
        }

        const replyEmbed = new EmbedBuilder().setColor('#10B981').setDescription(`${getCustomEmoji('nexus_tick') || '[Success]'} Support ticket created: <#${ticketChannel.id}>`);
        return interaction.reply({ embeds: [replyEmbed], ephemeral: true });
      } catch (err) {
        console.error('[Ticket Dropdown Error]', err);
        const errEmbed = new EmbedBuilder().setColor('#EF4444').setDescription(`${getCustomEmoji('nexus_cross') || '[Error]'} Failed to create ticket: ${err.message}`);
        return interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  } else if (interaction.isChannelSelectMenu()) {
    const { customId, values } = interaction;
    if (customId.startsWith('chan_select_channel_')) {
      const sessionId = customId.replace('chan_select_channel_', '');
      const session = getChannelEmbedSession(sessionId);
      if (!session) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${getCustomEmoji('nexus_cross') || '❌'} Session expired or invalid.`);
        return interaction.update({ embeds: [embed], components: [] });
      }

      const channelId = values[0];
      try {
        const targetChannel = await interaction.guild.channels.fetch(channelId);
        if (!targetChannel) {
          const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${getCustomEmoji('nexus_cross') || '❌'} Target channel not found.`);
          return interaction.update({ embeds: [embed], components: [] });
        }

        const { embedData } = session;
        const customEmbed = new EmbedBuilder().setColor(embedData.color || '#3B82F6');
        if (embedData.title && embedData.title.trim()) customEmbed.setTitle(embedData.title.trim());
        if (embedData.description && embedData.description.trim()) customEmbed.setDescription(embedData.description.trim());
        if (embedData.thumbnail && embedData.thumbnail.trim()) customEmbed.setThumbnail(embedData.thumbnail.trim());
        if (embedData.image && embedData.image.trim()) customEmbed.setImage(embedData.image.trim());
        if (embedData.footer && embedData.footer.trim()) customEmbed.setFooter({ text: embedData.footer.trim() });

        await targetChannel.send({ embeds: [customEmbed] });

        addGuildAudit(interaction.guildId, 'embeds', 'EMBED_COMMAND_SEND', `Sent custom embed to channel <#${channelId}>`, interaction.user.tag);

        const successEmbed = new EmbedBuilder()
          .setTitle(`${getCustomEmoji('nexus_tick') || '✅'} Embed Sent Successfully`)
          .setColor('#10B981')
          .setDescription(`Your custom embed was successfully sent to <#${channelId}>.`)
          .addFields(
            { name: `${getCustomEmoji('nexus_settings') || '🎯'} Target Channel`, value: `<#${channelId}>`, inline: true },
            { name: `${getCustomEmoji('nexus_user') || '👤'} Author`, value: `<@${interaction.user.id}>`, inline: true },
            { name: `${getCustomEmoji('nexus_date') || '🕒'} Time`, value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
          );

        deleteChannelEmbedSession(sessionId);
        return interaction.update({ embeds: [successEmbed], components: [] });
      } catch (err) {
        console.error('[Send Channel Embed Error]', err);
        deleteChannelEmbedSession(sessionId);
        const errEmbed = new EmbedBuilder().setColor('#EF4444').setDescription(`${getCustomEmoji('nexus_cross') || '❌'} Failed to send embed: ${err.message}`);
        return interaction.update({ embeds: [errEmbed], components: [] });
      }
    }
    if (customId.startsWith('tkt_select_log_channel_')) {
      const sessionId = customId.replace('tkt_select_log_channel_', '');
      const session = getTicketSetupSession(sessionId, interaction.guildId, interaction.user.id);
      if (session) {
        session.panelData.logChannelId = values[0];
        session.activeConfigField = null;
        const view = getTicketSetupBuilderViewAndComponents(sessionId, interaction.guild);
        return interaction.update({ embeds: view.embeds, components: view.components });
      }
    }
    if (customId.startsWith('tkt_select_deploy_channel_')) {
      const sessionId = customId.replace('tkt_select_deploy_channel_', '');
      const session = getTicketSetupSession(sessionId, interaction.guildId, interaction.user.id);
      if (session) {
        session.panelData.targetChannelId = values[0];
        const view = getTicketSetupBuilderViewAndComponents(sessionId, interaction.guild);
        return interaction.update({ embeds: view.embeds, components: view.components });
      }
    }
  } else if (interaction.isRoleSelectMenu()) {
    const { customId, values } = interaction;
    if (customId.startsWith('tkt_select_staff_role_')) {
      const sessionId = customId.replace('tkt_select_staff_role_', '');
      const session = getTicketSetupSession(sessionId, interaction.guildId, interaction.user.id);
      if (session) {
        session.panelData.staffRoleId = values[0];
        session.activeConfigField = null;
        const view = getTicketSetupBuilderViewAndComponents(sessionId, interaction.guild);
        return interaction.update({ embeds: view.embeds, components: view.components });
      }
    }
  } else if (interaction.isButton()) {
    const { customId } = interaction;

    // Handle ticket setup builder navigation & actions
    if (customId.startsWith('tkt_btn_step1_next_')) {
      const sessionId = customId.replace('tkt_btn_step1_next_', '');
      const session = getTicketSetupSession(sessionId, interaction.guildId, interaction.user.id);
      if (session) {
        session.step = 2;
        const view = getTicketSetupBuilderViewAndComponents(sessionId, interaction.guild);
        return interaction.update({ embeds: view.embeds, components: view.components });
      }
    }
    if (customId.startsWith('tkt_btn_step2_back_')) {
      const sessionId = customId.replace('tkt_btn_step2_back_', '');
      const session = getTicketSetupSession(sessionId, interaction.guildId, interaction.user.id);
      if (session) {
        session.step = 1;
        const view = getTicketSetupBuilderViewAndComponents(sessionId, interaction.guild);
        return interaction.update({ embeds: view.embeds, components: view.components });
      }
    }
    if (customId.startsWith('tkt_btn_step2_next_')) {
      const sessionId = customId.replace('tkt_btn_step2_next_', '');
      const session = getTicketSetupSession(sessionId, interaction.guildId, interaction.user.id);
      if (session) {
        session.step = 3;
        const view = getTicketSetupBuilderViewAndComponents(sessionId, interaction.guild);
        return interaction.update({ embeds: view.embeds, components: view.components });
      }
    }
    if (customId.startsWith('tkt_btn_step3_back_')) {
      const sessionId = customId.replace('tkt_btn_step3_back_', '');
      const session = getTicketSetupSession(sessionId, interaction.guildId, interaction.user.id);
      if (session) {
        session.step = 2;
        const view = getTicketSetupBuilderViewAndComponents(sessionId, interaction.guild);
        return interaction.update({ embeds: view.embeds, components: view.components });
      }
    }
    if (customId.startsWith('tkt_btn_step3_cancel_config_')) {
      const sessionId = customId.replace('tkt_btn_step3_cancel_config_', '');
      const session = getTicketSetupSession(sessionId, interaction.guildId, interaction.user.id);
      if (session) {
        session.activeConfigField = null;
        const view = getTicketSetupBuilderViewAndComponents(sessionId, interaction.guild);
        return interaction.update({ embeds: view.embeds, components: view.components });
      }
    }
    if (customId.startsWith('tkt_btn_step3_next_')) {
      const sessionId = customId.replace('tkt_btn_step3_next_', '');
      const session = getTicketSetupSession(sessionId, interaction.guildId, interaction.user.id);
      if (session) {
        session.step = 4;
        const view = getTicketSetupBuilderViewAndComponents(sessionId, interaction.guild);
        return interaction.update({ embeds: view.embeds, components: view.components });
      }
    }
    if (customId.startsWith('tkt_btn_step4_back_')) {
      const sessionId = customId.replace('tkt_btn_step4_back_', '');
      const session = getTicketSetupSession(sessionId, interaction.guildId, interaction.user.id);
      if (session) {
        session.step = 3;
        const view = getTicketSetupBuilderViewAndComponents(sessionId, interaction.guild);
        return interaction.update({ embeds: view.embeds, components: view.components });
      }
    }
    if (customId.startsWith('tkt_btn_add_button_')) {
      const sessionId = customId.replace('tkt_btn_add_button_', '');
      const session = getTicketSetupSession(sessionId, interaction.guildId, interaction.user.id);
      if (!session) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${getCustomEmoji('nexus_cross') || '❌'} Session expired.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      const modal = createAddTicketButtonModal(sessionId);
      return interaction.showModal(modal);
    }
    if (customId.startsWith('tkt_btn_add_menu_')) {
      const sessionId = customId.replace('tkt_btn_add_menu_', '');
      const session = getTicketSetupSession(sessionId, interaction.guildId, interaction.user.id);
      if (!session) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${getCustomEmoji('nexus_cross') || '❌'} Session expired.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      const modal = createAddTicketMenuOptionModal(sessionId);
      return interaction.showModal(modal);
    }
    if (customId.startsWith('tkt_btn_clear_components_')) {
      const sessionId = customId.replace('tkt_btn_clear_components_', '');
      const session = getTicketSetupSession(sessionId, interaction.guildId, interaction.user.id);
      if (session) {
        session.panelData.buttons = [];
        session.panelData.menuOptions = [];
        const view = getTicketSetupBuilderViewAndComponents(sessionId, interaction.guild);
        return interaction.update({ embeds: view.embeds, components: view.components });
      }
    }
    if (customId.startsWith('tkt_btn_edit_welcome_')) {
      const sessionId = customId.replace('tkt_btn_edit_welcome_', '');
      const session = getTicketSetupSession(sessionId, interaction.guildId, interaction.user.id);
      if (!session) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${getCustomEmoji('nexus_cross') || '❌'} Session expired.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      const modal = createTicketFieldModal(sessionId, 'welcomeMessage', session.panelData.welcomeMessage);
      return interaction.showModal(modal);
    }

    if (customId.startsWith('tkt_btn_cancel_')) {
      const sessionId = customId.replace('tkt_btn_cancel_', '');
      deleteTicketSetupSession(sessionId);
      const cancelEmbed = new EmbedBuilder()
        .setColor('#EF4444')
        .setTitle(`${getCustomEmoji('nexus_cross') || '❌'} Ticket Setup Cancelled`)
        .setDescription('Ticket builder setup prompt cancelled.');
      return interaction.update({ embeds: [cancelEmbed], components: [] });
    }

    if (customId.startsWith('tkt_btn_config_edit_') || customId.startsWith('tkt_btn_config_deploy_new_')) {
      const settings = getGuildSettings(interaction.guildId);
      const initialData = settings.tickets || null;
      const sessionId = createTicketSetupSession({ userId: interaction.user.id, guildId: interaction.guildId, initialData });
      const view = getTicketSetupBuilderViewAndComponents(sessionId, interaction.guild);
      return interaction.update({ embeds: view.embeds, components: view.components });
    }

    if (customId.startsWith('tkt_btn_deploy_now_') || customId.startsWith('tkt_btn_deploy_')) {
      const sessionId = customId.replace('tkt_btn_deploy_now_', '').replace('tkt_btn_deploy_', '');
      const session = getTicketSetupSession(sessionId);
      if (!session) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${getCustomEmoji('nexus_cross') || '❌'} Session expired or invalid.`);
        return interaction.update({ embeds: [embed], components: [] });
      }

      const { panelData } = session;
      const targetChannelId = panelData.targetChannelId || interaction.channelId;
      let targetChannel = interaction.channel;

      try {
        if (targetChannelId && interaction.guild) {
          const fetched = await interaction.guild.channels.fetch(targetChannelId).catch(() => null);
          if (fetched) targetChannel = fetched;
        }

        const deployEmbed = new EmbedBuilder()
          .setColor(panelData.color && /^#[0-9A-F]{6}$/i.test(panelData.color) ? panelData.color : '#5865F2')
          .setTitle(panelData.title || 'Support Ticket Panel')
          .setDescription(panelData.description || 'Select an option below to open a ticket.')
          .setTimestamp();

        if (panelData.thumbnail) deployEmbed.setThumbnail(panelData.thumbnail);
        else if (interaction.guild?.iconURL({ dynamic: true })) deployEmbed.setThumbnail(interaction.guild.iconURL({ dynamic: true }));

        if (panelData.footer) deployEmbed.setFooter({ text: panelData.footer });

        const componentRows = [];

        // Add Buttons Row if custom buttons added
        if (panelData.buttons && panelData.buttons.length > 0) {
          const btnRow = new ActionRowBuilder();
          panelData.buttons.slice(0, 5).forEach((btn, index) => {
            const emojiObj = resolveEmojiObject(btn.emoji || 'nexus_ticket', 'ticket');
            const b = new ButtonBuilder()
              .setCustomId(`tkt_action_open_${index}_${sessionId}`)
              .setLabel(btn.label)
              .setStyle(ButtonStyle.Primary);
            if (emojiObj) b.setEmoji(emojiObj);
            btnRow.addComponents(b);
          });
          componentRows.push(btnRow);
        }

        // Add Select Menu Row if dropdown options added
        if (panelData.menuOptions && panelData.menuOptions.length > 0) {
          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`tkt_panel_dropdown_select_${sessionId}`)
            .setPlaceholder('Select a ticket category to open...');

          panelData.menuOptions.slice(0, 25).forEach(opt => {
            const emojiObj = resolveEmojiObject(opt.emoji || 'nexus_ticket', 'ticket');
            const optionObj = {
              label: opt.label,
              value: opt.id,
              description: opt.description || `Open ticket for ${opt.label}`
            };
            if (emojiObj) optionObj.emoji = emojiObj;
            selectMenu.addOptions(optionObj);
          });

          componentRows.push(new ActionRowBuilder().addComponents(selectMenu));
        }

        // Default fallback button if no custom components added
        if (componentRows.length === 0) {
          const defaultRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`tkt_action_open_0_${sessionId}`)
              .setLabel('General Support')
              .setStyle(ButtonStyle.Primary)
              .setEmoji(resolveEmojiObject('nexus_ticket', 'ticket'))
          );
          componentRows.push(defaultRow);
        }

        await targetChannel.send({ embeds: [deployEmbed], components: componentRows });

        const settings = getGuildSettings(interaction.guildId);
        settings.tickets = {
          enabled: true,
          panelTitle: panelData.title,
          description: panelData.description,
          welcomeMessage: panelData.welcomeMessage,
          color: panelData.color,
          thumbnail: panelData.thumbnail,
          footer: panelData.footer,
          logChannelId: panelData.logChannelId,
          staffRoleId: panelData.staffRoleId,
          buttons: panelData.buttons,
          menuOptions: panelData.menuOptions,
          counter: settings.tickets?.counter || 0
        };
        saveGuildSettings(interaction.guildId, settings);
        addGuildAudit(interaction.guildId, 'TICKETS', 'PANEL_DEPLOYED', `Deployed custom ticket panel in #${targetChannel.name}`, interaction.user.tag);

        deleteTicketSetupSession(sessionId);

        const confirmEmbed = new EmbedBuilder()
          .setColor('#10B981')
          .setTitle(`${getCustomEmoji('nexus_tick') || '✅'} Ticket Panel Deployed`)
          .setDescription(`Successfully sent the interactive ticket panel to <#${targetChannel.id}>.`);

        return interaction.update({ embeds: [confirmEmbed], components: [] });
      } catch (err) {
        console.error('[Ticket Deploy Error]', err);
        deleteTicketSetupSession(sessionId);
        const errEmbed = new EmbedBuilder().setColor('#EF4444').setDescription(`${getCustomEmoji('nexus_cross') || '❌'} Failed to deploy ticket panel: ${err.message}`);
        return interaction.update({ embeds: [errEmbed], components: [] });
      }
    }

    // Handle ticket channel creation when user clicks a button on deployed panel
    if (customId.startsWith('tkt_action_open_') || customId.startsWith('ticket_open_')) {
      const guildSettings = getGuildSettings(interaction.guildId);
      const ticketConfig = guildSettings.tickets || {};
      
      let counter = ticketConfig.counter || 1;
      ticketConfig.counter = counter + 1;
      guildSettings.tickets = ticketConfig;
      saveGuildSettings(interaction.guildId, guildSettings);

      const cleanUserName = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
      const channelName = `${cleanUserName}-ticket-${counter}`;

      let parentCategoryId = ticketConfig.categoryId;
      if (!parentCategoryId) {
        const cat = interaction.guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.toUpperCase().includes('TICKET'));
        if (cat) parentCategoryId = cat.id;
      }

      try {
        const ticketChannel = await interaction.guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: parentCategoryId || undefined,
          permissionOverwrites: [
            {
              id: interaction.guild.roles.everyone.id,
              deny: [PermissionFlagsBits.ViewChannel]
            },
            {
              id: interaction.user.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles]
            },
            {
              id: interaction.client.user.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels]
            }
          ]
        });

        const rawWelcome = ticketConfig.welcomeMessage || 'Welcome {user}! Thank you for contacting support. Our staff team has been notified and will assist you shortly.';
        const welcomeText = rawWelcome.replace(/\{user\}/g, `<@${interaction.user.id}>`);

        const welcomeEmbed = new EmbedBuilder()
          .setColor('#5865F2')
          .setTitle(`${getCustomEmoji('nexus_ticket') || '🎫'} Support Ticket Opened`)
          .setDescription(welcomeText)
          .addFields(
            { name: 'Ticket Ref', value: `\`#${counter}\``, inline: true },
            { name: 'Opened By', value: `<@${interaction.user.id}>`, inline: true }
          )
          .setFooter({ text: 'NexusBot Support Ticket Automation' })
          .setTimestamp();

        const actionRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('tkt_act_claim')
            .setLabel('Claim Ticket')
            .setEmoji(resolveEmojiObject('nexus_createticket', 'createticket'))
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('tkt_act_close')
            .setLabel('Close Ticket')
            .setEmoji(resolveEmojiObject('nexus_ticket', 'ticket'))
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('tkt_act_delete')
            .setLabel('Delete Ticket')
            .setEmoji(resolveEmojiObject('nexus_cross', 'cross'))
            .setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({ content: `<@${interaction.user.id}>`, embeds: [welcomeEmbed], components: [actionRow] });

        const replyEmbed = new EmbedBuilder()
          .setColor('#10B981')
          .setDescription(`${getCustomEmoji('nexus_tick') || '✅'} Support ticket created: <#${ticketChannel.id}>`);

        return interaction.reply({ embeds: [replyEmbed], ephemeral: true });
      } catch (err) {
        console.error('[Ticket Creation Error]', err);
        const errEmbed = new EmbedBuilder()
          .setColor('#EF4444')
          .setDescription(`${getCustomEmoji('nexus_cross') || '❌'} Failed to create ticket channel: ${err.message}`);
        return interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }

    if (customId === 'tkt_act_claim' || customId === 'ticket_claim') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) && !interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({ content: '❌ Only staff members can claim tickets.', ephemeral: true });
      }

      const claimEmbed = new EmbedBuilder()
        .setColor('#10B981')
        .setDescription(`${getCustomEmoji('nexus_ticket') || '🎫'} Ticket claimed by <@${interaction.user.id}>. They will handle your inquiry.`);
      await interaction.reply({ embeds: [claimEmbed] });
      return;
    }

    if (customId === 'tkt_act_close' || customId === 'ticket_close') {
      try {
        await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
          SendMessages: false
        });
        const closeEmbed = new EmbedBuilder()
          .setColor('#F59E0B')
          .setDescription(`${getCustomEmoji('nexus_lock') || '🔒'} Ticket closed by <@${interaction.user.id}>. Conversation is now archived.`);
        await interaction.reply({ embeds: [closeEmbed] });
      } catch (e) {
        await interaction.reply({ content: `🔒 Ticket closed by <@${interaction.user.id}>.`, ephemeral: true });
      }
      return;
    }

    if (customId === 'tkt_act_delete' || customId === 'ticket_delete') {
      await interaction.reply({ content: '🗑️ Deleting ticket channel in 5 seconds...' });
      setTimeout(() => {
        interaction.channel?.delete().catch(() => {});
      }, 5000);
      return;
    }
    if (customId.startsWith('help_page_')) {
      const settings = interaction.guildId ? getGuildSettings(interaction.guildId) : {};
      const context = {
        client,
        guild: interaction.guild,
        user: interaction.user,
        prefix: settings.prefix || '!'
      };

      if (customId === 'help_page_close') {
        clearHelpTimeout(interaction.message?.id);
        try {
          await interaction.message.delete();
        } catch (e) {
          const disabled = getHelpEmbedAndComponents('home', context, true);
          await interaction.update({ embeds: disabled.embeds, components: disabled.components });
        }
        return;
      }

      const selectedCategory = customId
        .replace('help_page_first_', '')
        .replace('help_page_prev_', '')
        .replace('help_page_next_', '')
        .replace('help_page_last_', '')
        .replace('help_page_', '');
      const { embeds, components } = getHelpEmbedAndComponents(selectedCategory, context);
      await interaction.update({ embeds, components });
      setHelpTimeout(interaction, selectedCategory, context);
      return;
    }

    if (customId.startsWith('dm_btn_simple_')) {
      const sessionId = customId.replace('dm_btn_simple_', '');
      const modal = createSimpleMessageModal(sessionId);
      return interaction.showModal(modal);
    }

    if (customId.startsWith('dm_btn_embed_')) {
      const sessionId = customId.replace('dm_btn_embed_', '');
      const view = getEmbedBuilderViewAndComponents(sessionId);
      if (!view) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${getCustomEmoji('nexus_error') || '❌'} DM session expired or invalid.`);
        return interaction.update({ embeds: [embed], components: [] });
      }
      return interaction.update({ embeds: view.embeds, components: view.components });
    }

    if (customId.startsWith('dm_btn_cancel_')) {
      const sessionId = customId.replace('dm_btn_cancel_', '');
      deleteDmSession(sessionId);
      const cancelEmbed = new EmbedBuilder()
        .setColor('#EF4444')
        .setTitle(`${getCustomEmoji('nexus_cross') || '❌'} Cancelled`)
        .setDescription('Direct message prompt cancelled.');
      return interaction.update({ embeds: [cancelEmbed], components: [] });
    }

    if (customId.startsWith('chan_btn_send_')) {
      const sessionId = customId.replace('chan_btn_send_', '');
      const session = getChannelEmbedSession(sessionId);
      if (!session) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${getCustomEmoji('nexus_cross') || '❌'} Session expired or invalid.`);
        return interaction.update({ embeds: [embed], components: [] });
      }
      const view = getChannelSelectViewAndComponents(sessionId);
      return interaction.update({ embeds: view.embeds, components: view.components });
    }

    if (customId.startsWith('chan_btn_cancel_')) {
      const sessionId = customId.replace('chan_btn_cancel_', '');
      deleteChannelEmbedSession(sessionId);
      const cancelEmbed = new EmbedBuilder()
        .setColor('#EF4444')
        .setTitle(`${getCustomEmoji('nexus_cross') || '❌'} Cancelled`)
        .setDescription('Embed builder prompt cancelled.');
      return interaction.update({ embeds: [cancelEmbed], components: [] });
    }

    if (customId.startsWith('dm_btn_send_embed_')) {
      const sessionId = customId.replace('dm_btn_send_embed_', '');
      const session = getDmSession(sessionId);
      if (!session) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${getCustomEmoji('nexus_cross') || '❌'} Session expired or invalid.`);
        return interaction.update({ embeds: [embed], components: [] });
      }

      await interaction.deferUpdate();

      try {
        const { embedData, commandName, targetUser, targetRole, guildId } = session;
        const customEmbed = new EmbedBuilder().setColor(embedData.color || '#3B82F6');
        if (embedData.title) customEmbed.setTitle(embedData.title);
        if (embedData.description) customEmbed.setDescription(embedData.description);
        if (embedData.thumbnail) customEmbed.setThumbnail(embedData.thumbnail);
        if (embedData.image) customEmbed.setImage(embedData.image);
        if (embedData.footer) customEmbed.setFooter({ text: embedData.footer });

        if (commandName === 'dm') {
          await targetUser.send({ embeds: [customEmbed] });
          addGuildAudit(guildId, 'direct-messages', 'DM_COMMAND_SEND', `Sent DM embed to ${targetUser.tag}`, interaction.user.tag);

          const successEmbed = new EmbedBuilder()
            .setTitle(`${getCustomEmoji('nexus_tick') || '✅'} Direct Message Delivered`)
            .setColor('#10B981')
            .setDescription(`Your message was successfully delivered to <@${targetUser.id}>.`)
            .addFields(
              { name: `${getCustomEmoji('nexus_user') || '👤'} Recipient`, value: `**${targetUser.tag || targetUser.username}** (\`${targetUser.id}\`)`, inline: true },
              { name: `${getCustomEmoji('nexus_info') || '✉️'} Format`, value: '`Custom Embed`', inline: true },
              { name: `${getCustomEmoji('nexus_date') || '🕒'} Time`, value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
            );

          deleteDmSession(sessionId);
          return interaction.editReply({ embeds: [successEmbed], components: [] });
        } else if (commandName === 'dmglobal') {
          const members = await interaction.guild.members.fetch();
          let pool = members.filter(m => !m.user.bot);
          if (targetRole) {
            pool = pool.filter(m => m.roles.cache.has(targetRole.id));
          }

          let successCount = 0;
          let failCount = 0;

          for (const [_, member] of pool) {
            try {
              await member.send({ embeds: [customEmbed] });
              successCount++;
            } catch (e) {
              failCount++;
            }
          }

          addGuildAudit(guildId, 'direct-messages', 'DMGLOBAL_COMMAND_SEND', `Sent global DM embed to ${successCount} members (Failed: ${failCount})`, interaction.user.tag);

          const successEmbed = new EmbedBuilder()
            .setTitle(`${getCustomEmoji('nexus_tick') || '📢'} DM Broadcast Completed`)
            .setColor('#10B981')
            .setDescription(`Global DM broadcast completed for **${interaction.guild.name}**.`)
            .addFields(
              { name: `${getCustomEmoji('nexus_tick') || '✅'} Successful Deliveries`, value: `\`${successCount}\` members`, inline: true },
              { name: `${getCustomEmoji('nexus_cross') || '❌'} Failed Deliveries`, value: `\`${failCount}\` members`, inline: true },
              { name: `${getCustomEmoji('nexus_settings') || '🎯'} Target Role`, value: targetRole ? `<@&${targetRole.id}>` : '`Entire Server`', inline: true }
            );

          deleteDmSession(sessionId);
          return interaction.editReply({ embeds: [successEmbed], components: [] });
        }
      } catch (err) {
        console.error('[DM Send Embed Error]', err);
        deleteDmSession(sessionId);
        const errEmbed = new EmbedBuilder().setColor('#EF4444').setDescription(`${getCustomEmoji('nexus_cross') || '❌'} Failed to send DM: ${err.message}`);
        return interaction.editReply({ embeds: [errEmbed], components: [] });
      }
    }
  } else if (interaction.isModalSubmit()) {
    const { customId } = interaction;

    if (customId.startsWith('dm_modal_simple_')) {
      const sessionId = customId.replace('dm_modal_simple_', '');
      const session = getDmSession(sessionId);
      if (!session) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${getCustomEmoji('nexus_cross') || '❌'} Session expired or invalid.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const messageContent = interaction.fields.getTextInputValue('simple_message');
      const { commandName, targetUser, targetRole, guildId } = session;

      await interaction.deferReply({ ephemeral: true });

      try {
        if (commandName === 'dm') {
          await targetUser.send({ content: messageContent });
          addGuildAudit(guildId, 'direct-messages', 'DM_COMMAND_SEND', `Sent simple DM to ${targetUser.tag}. Content: ${messageContent}`, interaction.user.tag);

          const successEmbed = new EmbedBuilder()
            .setTitle(`${getCustomEmoji('nexus_tick') || '✅'} Direct Message Delivered`)
            .setColor('#10B981')
            .setDescription(`Your message was successfully delivered to <@${targetUser.id}>.`)
            .addFields(
              { name: `${getCustomEmoji('nexus_user') || '👤'} Recipient`, value: `**${targetUser.tag || targetUser.username}** (\`${targetUser.id}\`)`, inline: true },
              { name: `${getCustomEmoji('nexus_info') || '✉️'} Format`, value: '`Plain Text`', inline: true },
              { name: `${getCustomEmoji('nexus_date') || '🕒'} Time`, value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
              { name: `${getCustomEmoji('nexus_message') || '📝'} Content`, value: messageContent.length > 300 ? messageContent.slice(0, 297) + '...' : messageContent }
            );

          deleteDmSession(sessionId);
          return interaction.editReply({ embeds: [successEmbed] });
        } else if (commandName === 'dmglobal') {
          const members = await interaction.guild.members.fetch();
          let pool = members.filter(m => !m.user.bot);
          if (targetRole) {
            pool = pool.filter(m => m.roles.cache.has(targetRole.id));
          }

          let successCount = 0;
          let failCount = 0;

          for (const [_, member] of pool) {
            try {
              await member.send({ content: messageContent });
              successCount++;
            } catch (e) {
              failCount++;
            }
          }

          addGuildAudit(guildId, 'direct-messages', 'DMGLOBAL_COMMAND_SEND', `Sent global simple DM to ${successCount} members (Failed: ${failCount})`, interaction.user.tag);

          const successEmbed = new EmbedBuilder()
            .setTitle(`${getCustomEmoji('nexus_tick') || '📢'} DM Broadcast Completed`)
            .setColor('#10B981')
            .setDescription(`Global DM broadcast completed for **${interaction.guild.name}**.`)
            .addFields(
              { name: `${getCustomEmoji('nexus_tick') || '✅'} Successful Deliveries`, value: `\`${successCount}\` members`, inline: true },
              { name: `${getCustomEmoji('nexus_cross') || '❌'} Failed Deliveries`, value: `\`${failCount}\` members`, inline: true },
              { name: `${getCustomEmoji('nexus_settings') || '🎯'} Target Role`, value: targetRole ? `<@&${targetRole.id}>` : '`Entire Server`', inline: true },
              { name: `${getCustomEmoji('nexus_message') || '📝'} Content`, value: messageContent.length > 300 ? messageContent.slice(0, 297) + '...' : messageContent }
            );

          deleteDmSession(sessionId);
          return interaction.editReply({ embeds: [successEmbed] });
        }
      } catch (err) {
        console.error('[Simple DM Modal Error]', err);
        deleteDmSession(sessionId);
        const errEmbed = new EmbedBuilder().setColor('#EF4444').setDescription(`${getCustomEmoji('nexus_cross') || '❌'} Failed to send DM: ${err.message}`);
        return interaction.editReply({ embeds: [errEmbed] });
      }
    }

    if (customId.startsWith('dm_modal_field_')) {
      const rest = customId.replace('dm_modal_field_', '');
      const parts = rest.split('_');
      const fieldName = parts[0];
      const sessionId = parts.slice(1).join('_');

      const session = getDmSession(sessionId);
      if (!session) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${getCustomEmoji('nexus_cross') || '❌'} Session expired or invalid.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const newValue = interaction.fields.getTextInputValue('field_value');
      session.embedData[fieldName] = newValue;

      const view = getEmbedBuilderViewAndComponents(sessionId);
      return interaction.update({ embeds: view.embeds, components: view.components });
    }

    if (customId.startsWith('chan_modal_field_')) {
      const rest = customId.replace('chan_modal_field_', '');
      const parts = rest.split('_');
      const fieldName = parts[0];
      const sessionId = parts.slice(1).join('_');

      const session = getChannelEmbedSession(sessionId);
      if (!session) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${getCustomEmoji('nexus_cross') || '❌'} Session expired or invalid.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const newValue = interaction.fields.getTextInputValue('field_value');
      session.embedData[fieldName] = newValue;

      const view = getChannelEmbedBuilderViewAndComponents(sessionId);
      return interaction.update({ embeds: view.embeds, components: view.components });
    }

    if (customId.startsWith('tkt_modal_add_button_')) {
      const sessionId = customId.replace('tkt_modal_add_button_', '');
      const session = getTicketSetupSession(sessionId, interaction.guildId, interaction.user.id);
      if (!session) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${getCustomEmoji('nexus_cross') || '❌'} Session expired or invalid.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const label = interaction.fields.getTextInputValue('button_label');
      const emoji = interaction.fields.getTextInputValue('button_emoji') || 'nexus_ticket';

      session.pendingComponent = {
        type: 'button',
        label: label.trim(),
        emoji: emoji.trim()
      };

      const categoryView = buildCategorySelectForComponentView(sessionId, interaction.guild, label.trim());
      return interaction.update({ embeds: categoryView.embeds, components: categoryView.components });
    }

    if (customId.startsWith('tkt_modal_add_menu_option_')) {
      const sessionId = customId.replace('tkt_modal_add_menu_option_', '');
      const session = getTicketSetupSession(sessionId, interaction.guildId, interaction.user.id);
      if (!session) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${getCustomEmoji('nexus_cross') || '❌'} Session expired or invalid.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const label = interaction.fields.getTextInputValue('option_label');
      const desc = interaction.fields.getTextInputValue('option_desc') || '';
      const emoji = interaction.fields.getTextInputValue('option_emoji') || 'nexus_ticket';

      session.pendingComponent = {
        type: 'menu_option',
        label: label.trim(),
        desc: desc.trim(),
        emoji: emoji.trim()
      };

      const categoryView = buildCategorySelectForComponentView(sessionId, interaction.guild, label.trim());
      return interaction.update({ embeds: categoryView.embeds, components: categoryView.components });
    }

    if (customId.startsWith('tkt_modal_field_')) {
      const rest = customId.replace('tkt_modal_field_', '');
      const parts = rest.split('_');
      const fieldName = parts[0];
      const sessionId = parts.slice(1).join('_');

      const session = getTicketSetupSession(sessionId, interaction.guildId, interaction.user.id);
      if (!session) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${getCustomEmoji('nexus_cross') || '❌'} Session expired or invalid.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const newValue = interaction.fields.getTextInputValue('field_value');
      session.panelData[fieldName] = newValue;

      const view = getTicketSetupBuilderViewAndComponents(sessionId, interaction.guild);
      return interaction.update({ embeds: view.embeds, components: view.components });
    }
  }
}
