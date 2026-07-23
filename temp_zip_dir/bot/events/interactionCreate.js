/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits } from 'discord.js';
import { getGuildSettings, saveGuildSettings, addGuildAudit, issueWarning, DATA_DIR } from '../bot.js';
import { statusEmoji, getEmoji, Emojis } from '../emojis.js';
import fs from 'fs';
import path from 'path';

function getHelpEmbedAndComponents(category = 'home') {
  const shieldIcon = statusEmoji('shield') || getEmoji('nexus_shield');
  const automodIcon = statusEmoji('automod') || getEmoji('nexus_automod');
  const raidIcon = statusEmoji('raid') || getEmoji('nexus_raid');
  const nukeIcon = statusEmoji('nuke') || getEmoji('nexus_nuke');
  const lockIcon = statusEmoji('lock') || getEmoji('nexus_lock');
  const banIcon = statusEmoji('ban') || getEmoji('nexus_ban');
  const timeoutIcon = statusEmoji('timeout') || getEmoji('nexus_timeout');
  const commandIcon = statusEmoji('command') || getEmoji('nexus_command');
  const successIcon = statusEmoji('success') || getEmoji('nexus_checkmark');
  const userIcon = statusEmoji('user') || getEmoji('nexus_user');
  const ownerIcon = statusEmoji('owner') || getEmoji('nexus_owner');

  const embed = new EmbedBuilder()
    .setColor('#5865F2');

  if (category === 'home') {
    embed
      .setTitle(`${shieldIcon} Security Core Overview`)
      .setDescription('High-speed automated server protection shield.');
    
    embed.addFields(
      { name: `${automodIcon} Automated Moderation (AutoMod)`, value: 'Filters spam, links, invites, banned words, and emojis.' },
      { name: `${raidIcon} Raid Defenses (AntiRaid)`, value: 'Blocks sudden join bursts and quarantines guest accounts.' },
      { name: `${nukeIcon} Rogue Admin Protection (AntiNuke)`, value: 'Prevents mass deletions and rogue bot invites.' }
    );
  } else if (category === 'moderation') {
    embed
      .setTitle(`${banIcon} Moderation Commands`)
      .setDescription('Manual administration tools:')
      .addFields(
        { name: `${lockIcon} Channel Locks`, value: '`/lock` • `/unlock` • `/lockall` • `/unlockall` - Control channel writing access.' },
        { name: `${banIcon} Penalty Enforcement`, value: '`/ban` • `/tempban` • `/kick` • `/softban` • `/unban`' },
        { name: `${timeoutIcon} Timeout & Warns`, value: '`/mute` • `/unmute` • `/warn` • `/clearwarns`' },
        { name: `${successIcon} Chat Purge`, value: '`/purge` • `/slowmode` - Clean channels.' }
      );
  } else if (category === 'protection') {
    embed
      .setTitle(`${shieldIcon} Server Protection`)
      .setDescription('Automated background guards:')
      .addFields(
        { name: `${raidIcon} AntiRaid Controls`, value: '`/antiraid status` • `/antiraid log channel:#channel`' },
        { name: `${nukeIcon} AntiNuke Settings`, value: '`/antinuke status` • `/antinuke toggle` • `/antinuke log channel:#channel`' },
        { name: `${lockIcon} Safeguards`, value: '`/strip` • `/quarantine` • `/decensor` • `/whitelist`' }
      );
  } else if (category === 'dm_utility') {
    embed
      .setTitle(`${userIcon} Utilities & Direct Messages`)
      .setDescription('Interactive communication tools:')
      .addFields(
        { name: `${userIcon} DM Dispatch`, value: '`/dm` - Direct message a recipient.' },
        { name: `${ownerIcon} Mass Broadcasts`, value: '`/dmroll` • `/dmglobal` - Filtered DM lottery and announcements.' },
        { name: `${commandIcon} Audit Queries`, value: '`/warnings` • `/modlogs` - View history logs.' }
      );
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('help_category_select')
    .setPlaceholder('Select a command category...')
    .addOptions(
      {
        label: 'Main Guide & Overview',
        description: 'Nexus security overview and system guide.',
        value: 'home',
        emoji: Emojis['nexus_settings'] ? { id: Emojis['nexus_settings'] } : { name: '⚙️' }
      },
      {
        label: 'Moderation Registry',
        description: 'Commands for banning, muting, locks, and logs.',
        value: 'moderation',
        emoji: Emojis['nexus_ban'] ? { id: Emojis['nexus_ban'] } : { name: '🛡️' }
      },
      {
        label: 'Protection (Raid & Nuke)',
        description: 'Guards status, lockouts, and emergency demotions.',
        value: 'protection',
        emoji: Emojis['nexus_shield'] ? { id: Emojis['nexus_shield'] } : { name: '⚔️' }
      },
      {
        label: 'Direct Messages & Utilities',
        description: 'Mass DM broadcasts and info lookup tools.',
        value: 'dm_utility',
        emoji: Emojis['nexus_user'] ? { id: Emojis['nexus_user'] } : { name: '📬' }
      }
    );

  const row = new ActionRowBuilder().addComponents(selectMenu);

  return { embeds: [embed], components: [row] };
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
    const loadingIcon = statusEmoji('loading') || getEmoji('nexus_loading');
    const trashIcon = statusEmoji('trash') || getEmoji('nexus_trash') || '🗑️';

    const shieldIcon = statusEmoji('shield') || getEmoji('nexus_shield');
    const automodIcon = statusEmoji('automod') || getEmoji('nexus_automod');
    const raidIcon = statusEmoji('raid') || getEmoji('nexus_raid');
    const nukeIcon = statusEmoji('nuke') || getEmoji('nexus_nuke');

    // 1. Help Command
    if (commandName === 'help') {
      const { embeds, components } = getHelpEmbedAndComponents('home');
      return interaction.reply({ embeds, components });
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

    // 5. Direct Message (DM) Commands
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
      const messageContent = interaction.options.getString('message');
      const useEmbed = interaction.options.getBoolean('embed') ?? false;

      await interaction.deferReply({ ephemeral: true });

      try {
        if (useEmbed) {
          const embed = new EmbedBuilder()
            .setDescription(messageContent)
            .setColor('#5865F2');
          await targetUser.send({ embeds: [embed] });
        } else {
          await targetUser.send({ content: messageContent });
        }

        addGuildAudit(guildId, 'direct-messages', 'DM_COMMAND_SEND', `Sent DM command to ${targetUser.tag}. Content: ${messageContent}`, interaction.user.tag);

        const respEmbed = new EmbedBuilder().setColor('#10B981').setDescription(`${successIcon} Successfully sent direct message to <@${targetUser.id}>.`);
        return interaction.editReply({ embeds: [respEmbed] });
      } catch (err) {
        console.error('[Slash DM Command Error]', err);
        const respEmbed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Failed to send DM to <@${targetUser.id}>. They may have DMs closed or blocked the bot.`);
        return interaction.editReply({ embeds: [respEmbed] });
      }
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
      const useEmbed = interaction.options.getBoolean('embed') ?? false;

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

        if (useEmbed) {
          const embed = new EmbedBuilder()
            .setDescription(messageContent)
            .setColor('#5865F2');
          await randomMember.send({ embeds: [embed] });
        } else {
          await randomMember.send({ content: messageContent });
        }

        addGuildAudit(guildId, 'direct-messages', 'DMROLL_COMMAND_SEND', `Sent random DM to ${randomMember.user.tag} (Role filter: ${targetRole ? targetRole.name : 'None'}). Content: ${messageContent}`, interaction.user.tag);

        const respEmbed = new EmbedBuilder().setColor('#10B981').setDescription(`${successIcon} Selected random member **${randomMember.user.tag}** and successfully sent them the DM.`);
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

      const messageContent = interaction.options.getString('message');
      const targetRole = interaction.options.getRole('role');
      const useEmbed = interaction.options.getBoolean('embed') ?? false;

      await interaction.deferReply({ ephemeral: true });

      try {
        const members = await interaction.guild.members.fetch();
        let pool = members.filter(m => !m.user.bot);
        if (targetRole) {
          pool = pool.filter(m => m.roles.cache.has(targetRole.id));
        }

        if (pool.size === 0) {
          const respEmbed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} No eligible members found to broadcast DM to.`);
          return interaction.editReply({ embeds: [respEmbed] });
        }

        const progressEmbed = new EmbedBuilder().setColor('#3B82F6').setDescription(`${loadingIcon} Starting DM broadcast to **${pool.size}** members...`);
        await interaction.editReply({ embeds: [progressEmbed] });

        let successCount = 0;
        let failCount = 0;

        for (const [_, member] of pool) {
          try {
            if (useEmbed) {
              const embed = new EmbedBuilder()
                .setDescription(messageContent)
                .setColor('#5865F2');
              await member.send({ embeds: [embed] });
            } else {
              await member.send({ content: messageContent });
            }
            successCount++;
          } catch (e) {
            failCount++;
          }
        }

        addGuildAudit(guildId, 'direct-messages', 'DMGLOBAL_COMMAND_SEND', `Sent global DM to ${successCount} members (Failed: ${failCount}, Role filter: ${targetRole ? targetRole.name : 'None'}). Content: ${messageContent}`, interaction.user.tag);

        const finalEmbed = new EmbedBuilder()
          .setTitle(`${successIcon} DM Broadcast Completed`)
          .setColor('#10B981')
          .addFields(
            { name: 'Successfully Sent', value: `\`${successCount}\``, inline: true },
            { name: 'Failed Deliveries', value: `\`${failCount}\``, inline: true }
          )
          .setTimestamp();

        return interaction.editReply({ embeds: [finalEmbed] });
      } catch (err) {
        console.error('[Slash DmGlobal Command Error]', err);
        const respEmbed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Failed to execute DM Global broadcast: ${err.message}`);
        return interaction.editReply({ embeds: [respEmbed] });
      }
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
      await interaction.deferReply();
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const reason = interaction.options.getString('reason') || 'Locked by administrator';
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false }, { reason });
      addGuildAudit(guildId, 'moderation', 'CHANNEL_LOCK', `Locked channel #${channel.name}: ${reason}`, interaction.user.tag);
      
      const embed = new EmbedBuilder()
        .setTitle(`${lockIcon} Channel Locked`)
        .setColor('#EF4444')
        .setDescription(`Channel <#${channel.id}> has been **LOCKED**.`)
        .addFields(
          { name: 'Channel', value: `<#${channel.id}>`, inline: true },
          { name: 'Reason', value: `\`${reason}\``, inline: true }
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
      await interaction.deferReply();
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const reason = interaction.options.getString('reason') || 'Unlocked by administrator';
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null }, { reason });
      addGuildAudit(guildId, 'moderation', 'CHANNEL_UNLOCK', `Unlocked channel #${channel.name}: ${reason}`, interaction.user.tag);
      
      const embed = new EmbedBuilder()
        .setTitle(`${successIcon} Channel Unlocked`)
        .setColor('#10B981')
        .setDescription(`Channel <#${channel.id}> has been **UNLOCKED**.`)
        .addFields(
          { name: 'Channel', value: `<#${channel.id}>`, inline: true },
          { name: 'Reason', value: `\`${reason}\``, inline: true }
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
            { name: 'Channels Locked', value: `\`${count}\``, inline: true },
            { name: 'Reason', value: `\`${reason}\``, inline: true },
            { name: 'Executed By', value: `<@${user.id}>`, inline: true }
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
          .setTitle(`${successIcon} Server Channels Unlocked`)
          .setColor('#10B981')
          .setDescription(`Unlocked **${count}** text channels across the server for \`@everyone\`.`)
          .addFields(
            { name: 'Channels Unlocked', value: `\`${count}\``, inline: true },
            { name: 'Reason', value: `\`${reason}\``, inline: true },
            { name: 'Executed By', value: `<@${user.id}>`, inline: true }
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
      try {
        await interaction.guild.members.ban(targetUser.id, { reason, deleteMessageSeconds: deleteDays * 86400 });
        addGuildAudit(guildId, 'moderation', 'MEMBER_BAN', `Banned ${targetUser.tag}: ${reason}`, interaction.user.tag);
        
        const embed = new EmbedBuilder()
          .setTitle(`${successIcon} Member Banned`)
          .setColor('#EF4444')
          .setDescription(`Permanently banned **${targetUser.tag}** (\`${targetUser.id}\`).`)
          .addFields(
            { name: 'Target User', value: `<@${targetUser.id}>`, inline: true },
            { name: 'Reason', value: `\`${reason}\``, inline: true },
            { name: 'Delete Days', value: `\`${deleteDays} day(s)\``, inline: true }
          )
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Failed to ban member: ${err.message}`);
        return interaction.editReply({ embeds: [embed] });
      }
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
      try {
        await interaction.guild.members.ban(targetUser.id, { reason: `Tempban (${duration}): ${reason}` });
        addGuildAudit(guildId, 'moderation', 'MEMBER_TEMPBAN', `Tempbanned ${targetUser.tag} for ${duration}: ${reason}`, interaction.user.tag);
        
        const embed = new EmbedBuilder()
          .setTitle(`${successIcon} Temporary Ban Issued`)
          .setColor('#EF4444')
          .setDescription(`Temporarily banned **${targetUser.tag}** for \`${duration}\`.`)
          .addFields(
            { name: 'Target User', value: `<@${targetUser.id}>`, inline: true },
            { name: 'Duration', value: `\`${duration}\``, inline: true },
            { name: 'Reason', value: `\`${reason}\``, inline: true }
          )
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Failed to tempban member: ${err.message}`);
        return interaction.editReply({ embeds: [embed] });
      }
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
      try {
        await interaction.guild.members.ban(targetUser.id, { reason, deleteMessageSeconds: 7 * 86400 });
        await interaction.guild.members.unban(targetUser.id, 'Softban complete');
        addGuildAudit(guildId, 'moderation', 'MEMBER_SOFTBAN', `Softbanned ${targetUser.tag}: ${reason}`, interaction.user.tag);
        
        const embed = new EmbedBuilder()
          .setTitle(`${successIcon} Member Softbanned`)
          .setColor('#F59E0B')
          .setDescription(`Softbanned **${targetUser.tag}** (kicked user & cleared 7 days of messages).`)
          .addFields(
            { name: 'Target User', value: `<@${targetUser.id}>`, inline: true },
            { name: 'Reason', value: `\`${reason}\``, inline: true }
          )
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Failed to softban member: ${err.message}`);
        return interaction.editReply({ embeds: [embed] });
      }
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
      try {
        await interaction.guild.members.unban(userId, reason);
        addGuildAudit(guildId, 'moderation', 'MEMBER_UNBAN', `Unbanned user ID ${userId}: ${reason}`, interaction.user.tag);
        
        const embed = new EmbedBuilder()
          .setTitle(`${successIcon} User Unbanned`)
          .setColor('#10B981')
          .setDescription(`Successfully unbanned user ID \`${userId}\`.`)
          .addFields({ name: 'Reason', value: `\`${reason}\``, inline: true })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Failed to unban user: ${err.message}`);
        return interaction.editReply({ embeds: [embed] });
      }
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
      try {
        const member = await interaction.guild.members.fetch(targetUser.id);
        await member.kick(reason);
        addGuildAudit(guildId, 'moderation', 'MEMBER_KICK', `Kicked ${targetUser.tag}: ${reason}`, interaction.user.tag);
        
        const embed = new EmbedBuilder()
          .setTitle(`${successIcon} Member Kicked`)
          .setColor('#F59E0B')
          .setDescription(`Successfully kicked **${targetUser.tag}**.`)
          .addFields(
            { name: 'Target User', value: `<@${targetUser.id}>`, inline: true },
            { name: 'Reason', value: `\`${reason}\``, inline: true }
          )
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Failed to kick member: ${err.message}`);
        return interaction.editReply({ embeds: [embed] });
      }
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

      try {
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

        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Failed to mute member: ${err.message}`);
        return interaction.editReply({ embeds: [embed] });
      }
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

    // 24. Decensor command
    if (commandName === 'decensor') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`ManageMessages\` required.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      const caseIdInput = interaction.options.getString('case_id');
      await interaction.deferReply();
      const warningsPath = path.join(DATA_DIR, guildId, 'warnings.json');
      let warnings = [];
      try { warnings = JSON.parse(fs.readFileSync(warningsPath, 'utf8')); } catch (e) {}
      
      let cleared = false;
      warnings = warnings.map(w => {
        if (w.caseId === caseIdInput.toUpperCase().trim()) {
          w.active = false;
          cleared = true;
        }
        return w;
      });

      if (cleared) {
        fs.writeFileSync(warningsPath, JSON.stringify(warnings, null, 2));
        addGuildAudit(guildId, 'moderation', 'CASE_DECENSOR', `Decensored case ${caseIdInput}`, interaction.user.tag);
        
        const embed = new EmbedBuilder().setColor('#10B981').setDescription(`${successIcon} Case \`${caseIdInput}\` has been decensored/deactivated.`);
        return interaction.editReply({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Case ID \`${caseIdInput}\` not found.`);
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

    // Catch-all safety check to ensure interaction is ALWAYS acknowledged
    if (!interaction.replied && !interaction.deferred) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Command \`/${commandName}\` acknowledged.`);
      await interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
    }
  } else if (interaction.isStringSelectMenu()) {
    const { customId, values } = interaction;
    if (customId === 'help_category_select') {
      const selectedCategory = values[0];
      const { embeds, components } = getHelpEmbedAndComponents(selectedCategory);
      return interaction.update({ embeds, components });
    }
  }
}
