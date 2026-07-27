/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { CUSTOM_EMOJIS, getCustomEmoji, getCustomEmojiObject } from './customEmojis.js';

const activeHelpTimeouts = new Map();

export function clearHelpTimeout(msgId) {
  if (activeHelpTimeouts.has(msgId)) {
    clearTimeout(activeHelpTimeouts.get(msgId));
    activeHelpTimeouts.delete(msgId);
  }
}

export function setHelpTimeout(target, category, context) {
  const msgId = target.id || target.message?.id;
  if (!msgId) return;

  clearHelpTimeout(msgId);

  const timer = setTimeout(async () => {
    activeHelpTimeouts.delete(msgId);
    try {
      const disabled = getHelpEmbedAndComponents(category, context, true);
      if (typeof target.editReply === 'function') {
        await target.editReply({ embeds: disabled.embeds, components: disabled.components });
      } else if (typeof target.edit === 'function') {
        await target.edit({ embeds: disabled.embeds, components: disabled.components });
      } else if (target.message && typeof target.message.edit === 'function') {
        await target.message.edit({ embeds: disabled.embeds, components: disabled.components });
      }
    } catch (e) {
      // Message deleted or already modified
    }
  }, 120000);

  activeHelpTimeouts.set(msgId, timer);
}

export function getHelpEmbedAndComponents(category = 'home', context = {}, isDisabled = false) {
  const { client, guild, user, prefix = '!', commandQuery = null } = context;

  const botName = client?.user?.username || 'NexusBot';
  const authorName = user?.username || botName;
  const authorIconUrl = user?.displayAvatarURL?.({ dynamic: true }) || client?.user?.displayAvatarURL?.() || 'https://cdn.discordapp.com/embed/avatars/0.png';
  const clientId = client?.user?.id || process.env.DISCORD_CLIENT_ID || '1528216029816426608';
  const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=2113268958&scope=bot`;
  const supportUrl = 'https://discord.gg/Dz3Rgc7FKn';

  // Embed color matching requested reference: 16711680 (#FF0000)
  const embedColor = 16711680;

  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setAuthor({
      name: authorName,
      iconURL: authorIconUrl
    });

  const categoriesList = ['home', 'automod', 'antinuke', 'antiraid', 'utility'];

  const totalCommandsCount = 14;
  const slashCommandsCount = 14;

  if (commandQuery) {
    const query = commandQuery.toLowerCase().replace(/^[!/&]/, '');

    const commandDict = {
      antinuke: { name: 'antinuke', usage: '/antinuke <status|toggle|log>', module: 'Antinuke Security', desc: 'Prevents unauthorized channel deletions, role wipes, and rogue admin actions.' },
      antiraid: { name: 'antiraid', usage: '/antiraid <status|log>', module: 'Anti Raid Defense', desc: 'Detects rapid member joins and quarantines suspicious accounts.' },
      automod: { name: 'automod', usage: '/automod <status|toggle|log>', module: 'AutoMod Protection', desc: 'Automated spam, invite link, duplicate message, and bad word filtering.' },
      dm: { name: 'dm', usage: '/dm <user> <message> [title] [color] [embed]', module: 'Utility', desc: 'Send a direct message from the bot to a specific user.' },
      dmroll: { name: 'dmroll', usage: '/dmroll <message> [role] [title]', module: 'Utility', desc: 'DM a random server member to run a lottery or giveaway draw.' },
      dmglobal: { name: 'dmglobal', usage: '/dmglobal <message> [role] [title]', module: 'Utility', desc: 'Send a DM to all members of the server (or filter by role).' },
      userinfo: { name: 'userinfo', usage: '/userinfo [user]', module: 'Utility', desc: 'Inspects a user moderation profile, roles, joined date, and security record.' },
      serverinfo: { name: 'serverinfo', usage: '/serverinfo', module: 'Utility', desc: 'Displays server member metrics and verification status.' },
      modlogs: { name: 'modlogs', usage: '/modlogs <moderator>', module: 'Utility', desc: 'Searches audit database for actions executed by a specific moderator.' },
      extractembed: { name: 'extractembed', usage: '/extractembed [message_id]', module: 'Utility', desc: 'Extracts embeds from a message into raw JSON.' },
      extract: { name: 'extract', usage: '/extract', module: 'Utility', desc: 'Extracts all custom emojis from the server formatted as name = <:name:id>.' },
      quarantine: { name: 'quarantine', usage: '/quarantine <user> <active>', module: 'Anti Raid Defense', desc: 'Toggles quarantine/isolation status on a suspicious member.' },
      strip: { name: 'strip', usage: '/strip <user> [reason]', module: 'Antinuke Security', desc: 'Emergency admin strip: immediate removal of admin roles.' },
      whitelist: { name: 'whitelist', usage: '/whitelist <add|remove> [role] [user]', module: 'Antinuke Security', desc: 'Adds or removes a role or member from bypass filters.' }
    };

    const cmdInfo = commandDict[query] || { name: query, usage: `/${query} [options]`, module: 'General', desc: `Execute command /${query}` };

    embed.setDescription(
      `### __**Command Info: /${cmdInfo.name}**__\n` +
      `\`\`\`${cmdInfo.usage}\`\`\`\n` +
      `> **Description**: ${cmdInfo.desc}\n` +
      `> **Module**: ${cmdInfo.module}\n` +
      `> **Prefix Alternative**: \`${prefix}${cmdInfo.name}\`\n\n` +
      `-# **Need help? Contact [Support](${supportUrl}).**`
    );
  } else if (category === 'home') {
    embed.setDescription(
      `### __Bot Overview:__\n` +
      `${getCustomEmoji('nexus_prefix')} : Server Prefix: **${prefix}**\n` +
      `${getCustomEmoji('nexus_commands')} : Total Commands: **${totalCommandsCount}** | Slash: **${slashCommandsCount}**\n` +
      `${getCustomEmoji('nexus_link')} : **[Get ${botName}](${inviteUrl})** | **[Website](${supportUrl})**\n\n` +
      `__**How do you use me?**__\n` +
      `\`\`\`/help <command/module> for more info regarding that command/module!\nExample: /help automod\`\`\`\n` +
      `### __**Main Modules:**__\n` +
      `> ${getCustomEmoji('nexus_automod')} \`:\` AutoMod Protection\n` +
      `> ${getCustomEmoji('nexus_shield')} \`:\` AntiNuke Security\n` +
      `> ${getCustomEmoji('nexus_antiraid')} \`:\` Anti-Raid Defense\n` +
      `> ${getCustomEmoji('nexus_message')} \`:\` Direct Messaging & Utility\n\n` +
      `-# **Use buttons to swap pages & menu to select help pages. Need help? Contact [Support](${supportUrl}).**`
    );
  } else if (category === 'automod') {
    embed.setDescription(
      `__**Commands List:**__\n` +
      `> \`/automod status\` \`:\` View active AutoMod filters and penalty actions\n` +
      `> \`/automod toggle <enabled>\` \`:\` Toggle AutoMod filter engine\n` +
      `> \`/automod log <channel>\` \`:\` Configure AutoMod violation log channel\n\n` +
      `-# **Use menu below to switch help modules or contact [Support](${supportUrl}).**`
    );
  } else if (category === 'antinuke') {
    embed.setDescription(
      `__**Commands List:**__\n` +
      `> \`/antinuke status\` \`:\` Inspect AntiNuke defense metrics and triggers\n` +
      `> \`/antinuke toggle <enabled>\` \`:\` Toggle AntiNuke protection guard\n` +
      `> \`/antinuke log <channel>\` \`:\` Configure AntiNuke security log channel\n` +
      `> \`/strip <user> [reason]\` \`:\` Emergency admin strip (instant role purge)\n` +
      `> \`/whitelist <add|remove> [role] [user]\` \`:\` Manage bypass whitelist\n\n` +
      `-# **Use menu below to switch help modules or contact [Support](${supportUrl}).**`
    );
  } else if (category === 'antiraid') {
    embed.setDescription(
      `__**Commands List:**__\n` +
      `> \`/antiraid status\` \`:\` View active AntiRaid burst limits and account age minimums\n` +
      `> \`/antiraid log <channel>\` \`:\` Set the AntiRaid alert channel\n` +
      `> \`/quarantine <user> <active>\` \`:\` Isolate or release a raid suspect member\n\n` +
      `-# **Use menu below to switch help modules or contact [Support](${supportUrl}).**`
    );
  } else if (category === 'utility') {
    embed.setDescription(
      `__**Commands List:**__\n` +
      `> \`/dm <user> <message>\` \`:\` Send direct message to a user\n` +
      `> \`/dmroll <message> [role]\` \`:\` Send DM to a randomly selected member\n` +
      `> \`/dmglobal <message> [role]\` \`:\` Broadcast a DM to the entire server\n` +
      `> \`/userinfo [user]\` \`:\` View user profile, roles & joined date\n` +
      `> \`/serverinfo\` \`:\` View server member counts & metrics\n` +
      `> \`/modlogs <moderator>\` \`:\` Search moderator audit execution logs\n` +
      `> \`/extractembed [msg_id]\` \`:\` Extract message embed into raw JSON\n` +
      `> \`/extract\` \`:\` Extract custom emojis as name = <:name:id>\n\n` +
      `-# **Use menu below to switch help modules or contact [Support](${supportUrl}).**`
    );
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('help_category_select')
    .setPlaceholder('Select a category...')
    .setDisabled(isDisabled);

  if (isDisabled) {
    selectMenu.addOptions([
      {
        label: 'Help menu expired',
        value: 'disabled',
        description: 'Select menu is disabled.'
      }
    ]);
  } else {
    selectMenu.addOptions([
      {
        label: 'Main Overview',
        description: 'General info and module overview.',
        value: 'home',
        emoji: getCustomEmojiObject('nexus_home') || { name: '🏠' }
      },
      {
        label: 'AutoMod Protection',
        description: 'Spam, link, and duplicate filter settings.',
        value: 'automod',
        emoji: getCustomEmojiObject('nexus_automod') || { name: '⚙️' }
      },
      {
        label: 'Antinuke Security',
        description: 'Protection against rogue admins & deletions.',
        value: 'antinuke',
        emoji: getCustomEmojiObject('nexus_antinuke') || getCustomEmojiObject('nexus_shield') || { name: '🛡️' }
      },
      {
        label: 'Anti Raid Defense ⭐',
        description: 'Anti-Raid, burst join detection & quarantine.',
        value: 'antiraid',
        emoji: getCustomEmojiObject('nexus_antiraid') || { name: '⚔️' }
      },
      {
        label: 'Direct Messaging & Utility',
        description: 'Direct messages, userinfo, serverinfo & extract.',
        value: 'utility',
        emoji: getCustomEmojiObject('nexus_message') || getCustomEmojiObject('nexus_info') || { name: '📬' }
      }
    ]);
  }

  const currentIndex = categoriesList.indexOf(category) !== -1 ? categoriesList.indexOf(category) : 0;
  const firstCategory = categoriesList[0];
  const lastCategory = categoriesList[categoriesList.length - 1];
  const prevCategory = categoriesList[(currentIndex - 1 + categoriesList.length) % categoriesList.length];
  const nextCategory = categoriesList[(currentIndex + 1) % categoriesList.length];

  // Button row matching requested style with custom emojis: nexus_firstpage, nexus_previouspage, nexus_cross, nexus_nextpage, nexus_lastpage
  const btnRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`help_page_first_${firstCategory}`)
      .setEmoji(getCustomEmojiObject('nexus_firstpage') || '⏪')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isDisabled),
    new ButtonBuilder()
      .setCustomId(`help_page_prev_${prevCategory}`)
      .setEmoji(getCustomEmojiObject('nexus_previouspage') || '◀️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isDisabled),
    new ButtonBuilder()
      .setCustomId('help_page_close')
      .setEmoji(getCustomEmojiObject('nexus_cross') || '❌')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(isDisabled),
    new ButtonBuilder()
      .setCustomId(`help_page_next_${nextCategory}`)
      .setEmoji(getCustomEmojiObject('nexus_nextpage') || '▶️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isDisabled),
    new ButtonBuilder()
      .setCustomId(`help_page_last_${lastCategory}`)
      .setEmoji(getCustomEmojiObject('nexus_lastpage') || '⏩')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isDisabled)
  );

  const menuRow = new ActionRowBuilder().addComponents(selectMenu);

  const linkRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Get Bot')
      .setURL(inviteUrl)
      .setStyle(ButtonStyle.Link),
    new ButtonBuilder()
      .setLabel('Support')
      .setURL(supportUrl)
      .setStyle(ButtonStyle.Link)
  );

  return { embeds: [embed], components: [btnRow, menuRow, linkRow] };
}

