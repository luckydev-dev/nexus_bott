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
  }, 60000);

  activeHelpTimeouts.set(msgId, timer);
}

export function getHelpEmbedAndComponents(category = 'home', context = {}, isDisabled = false) {
  const { client, guild, user, prefix = '!', commandQuery = null } = context;

  const botName = client?.user?.username || 'NexusBot';
  const authorName = user?.username || botName;
  const authorIconUrl = user?.displayAvatarURL?.({ dynamic: true }) || client?.user?.displayAvatarURL?.() || 'https://cdn.discordapp.com/embed/avatars/0.png';
  const clientId = client?.user?.id || process.env.DISCORD_CLIENT_ID || '1528216029816426608';
  const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=2113268958&scope=bot`;
  const supportUrl = 'https://discord.gg/8hbsvybVGs';

  // Embed color matching requested reference: 16711680 (#FF0000)
  const embedColor = 16711680;

  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setAuthor({
      name: authorName,
      iconURL: authorIconUrl
    });

  const categoriesList = ['home', 'antinuke', 'antiraid', 'automod', 'moderation', 'utility', 'voice', 'admin'];

  const totalCommandsCount = 455;
  const slashCommandsCount = 54;

  if (commandQuery) {
    const query = commandQuery.toLowerCase().replace(/^[!/&]/, '');

    const commandDict = {
      ban: { name: 'ban', usage: '/ban <user> [reason] [delete_messages]', module: 'Moderation', desc: 'Permanently bans a malicious user from the server.' },
      tempban: { name: 'tempban', usage: '/tempban <user> <duration> [reason]', module: 'Moderation', desc: 'Temporarily bans a member for a specific duration.' },
      softban: { name: 'softban', usage: '/softban <user> [reason]', module: 'Moderation', desc: 'Bans and immediately unbans to wipe member chat history.' },
      unban: { name: 'unban', usage: '/unban <user_id> [reason]', module: 'Moderation', desc: 'Revokes an active user ban.' },
      kick: { name: 'kick', usage: '/kick <user> [reason]', module: 'Moderation', desc: 'Kicks a member from the server under audit guidelines.' },
      mute: { name: 'mute', usage: '/mute <user> <duration> [reason]', module: 'Moderation', desc: 'Restricts messaging privileges by placing a user in timeout.' },
      unmute: { name: 'unmute', usage: '/unmute <user> [reason]', module: 'Moderation', desc: 'Removes active timeout restrictions from a member.' },
      warn: { name: 'warn', usage: '/warn <user> <reason>', module: 'Moderation', desc: 'Formally issues a warn ticket on a member and records it.' },
      warnings: { name: 'warnings', usage: '/warnings [user]', module: 'Moderation', desc: 'Retrieves infraction history and active warning logs.' },
      clearwarns: { name: 'clearwarns', usage: '/clearwarns <user> [case_id]', module: 'Moderation', desc: 'Clears warning infraction logs for a member.' },
      lock: { name: 'lock', usage: '/lock [channel] [reason]', module: 'Moderation', desc: 'Locks down text channel for @everyone.' },
      unlock: { name: 'unlock', usage: '/unlock [channel] [reason]', module: 'Moderation', desc: 'Unlocks text channel for @everyone.' },
      lockall: { name: 'lockall', usage: '/lockall [reason]', module: 'Moderation', desc: 'Emergency lock on all text channels across the server.' },
      unlockall: { name: 'unlockall', usage: '/unlockall [reason]', module: 'Moderation', desc: 'Unlocks all text channels across the server.' },
      purge: { name: 'purge', usage: '/purge <amount> [filter]', module: 'Moderation', desc: 'Mass deletes up to 100 recent messages in channel.' },
      slowmode: { name: 'slowmode', usage: '/slowmode <delay> [channel]', module: 'Moderation', desc: 'Adjusts message rate delay (slowmode) for a channel.' },
      antinuke: { name: 'antinuke', usage: '/antinuke <status|toggle|log>', module: 'Antinuke Security', desc: 'Prevents unauthorized channel deletions, role wipes, and rogue admin actions.' },
      antiraid: { name: 'antiraid', usage: '/antiraid <status|log>', module: 'Anti Raid Defense', desc: 'Detects rapid member joins and quarantines suspicious accounts.' },
      automod: { name: 'automod', usage: '/automod <status|toggle|log>', module: 'AutoMod Protection', desc: 'Automated spam, invite link, duplicate message, and bad word filtering.' },
      dm: { name: 'dm', usage: '/dm <user> <message> [title] [color] [embed]', module: 'Utility', desc: 'Send a direct message from the bot to a specific user.' },
      dmroll: { name: 'dmroll', usage: '/dmroll <message> [role] [title]', module: 'Utility', desc: 'DM a random server member to run a lottery or giveaway draw.' },
      dmglobal: { name: 'dmglobal', usage: '/dmglobal <message> [role] [title]', module: 'Utility', desc: 'Send a DM to all members of the server (or filter by role).' },
      userinfo: { name: 'userinfo', usage: '/userinfo [user]', module: 'Utility', desc: 'Inspects a user moderation profile, roles, joined date, and security record.' },
      serverinfo: { name: 'serverinfo', usage: '/serverinfo', module: 'Utility', desc: 'Displays server security overview, member metrics, and verification status.' },
      modlogs: { name: 'modlogs', usage: '/modlogs <moderator>', module: 'Utility', desc: 'Searches audit database for actions executed by a specific moderator.' },
      extractembed: { name: 'extractembed', usage: '/extractembed [message_id]', module: 'Utility', desc: 'Extracts embeds from a message into raw JSON.' },
      extract: { name: 'extract', usage: '/extract', module: 'Utility', desc: 'Extracts all custom emojis from the server formatted as name = <:name:id>.' },
      quarantine: { name: 'quarantine', usage: '/quarantine <user> <active>', module: 'Protection', desc: 'Toggles quarantine/isolation status on a suspicious member.' },
      strip: { name: 'strip', usage: '/strip <user> [reason]', module: 'Protection', desc: 'Emergency admin strip: immediate removal of admin roles.' },
      whitelist: { name: 'whitelist', usage: '/whitelist <add|remove> [role] [user]', module: 'Admin Setup', desc: 'Adds or removes a role or member from bypass filters.' },
      role: { name: 'role', usage: '/role <add|remove> <user> <role>', module: 'Admin Setup', desc: 'Grants or revokes a role from a target member.' },
      massrole: { name: 'massrole', usage: '/massrole <add|remove> <humans|bots|all> <role>', module: 'Admin Setup', desc: 'Bulk assigns or removes a role for all humans or all bots.' },
      nick: { name: 'nick', usage: '/nick <user> [nickname]', module: 'Admin Setup', desc: 'Changes or resets nickname of a server member.' },
      voicemute: { name: 'voicemute', usage: '/voicemute <user> [reason]', module: 'Voice Security', desc: 'Server mutes a member in voice channels.' },
      voiceunmute: { name: 'voiceunmute', usage: '/voiceunmute <user> [reason]', module: 'Voice Security', desc: 'Server unmutes a member in voice channels.' },
      voicekick: { name: 'voicekick', usage: '/voicekick <user> [reason]', module: 'Voice Security', desc: 'Disconnects a user from active voice channel.' },
      deafen: { name: 'deafen', usage: '/deafen <user> [reason]', module: 'Voice Security', desc: 'Server deafens a member in voice channels.' },
      undeafen: { name: 'undeafen', usage: '/undeafen <user> [reason]', module: 'Voice Security', desc: 'Server undeafens a member in voice channels.' }
    };

    const cmdInfo = commandDict[query] || { name: query, usage: `/${query} [options]`, module: 'General', desc: `Execute command /${query}` };

    embed.setDescription(
      `### __**Command Info: /${cmdInfo.name}**__\n` +
      `\`\`\`${cmdInfo.usage}\`\`\`\n` +
      `> **Description**: ${cmdInfo.desc}\n` +
      `> **Module**: ${cmdInfo.module}\n` +
      `> **Prefix Alternative**: \`${prefix}${cmdInfo.name}\`\n\n` +
      `-# **Need help? Contact [Support](${supportUrl}) or email us at <contact@nexusbot.io>.**`
    );
  } else if (category === 'home') {
    embed.setDescription(
      `### __Bot Overview:__\n` +
      `${getCustomEmoji('nexus_prefix')} : Server Prefix: **${prefix}**\n` +
      `${getCustomEmoji('nexus_commands')} : Total Commands: **${totalCommandsCount}** | Slash: **${slashCommandsCount}**\n` +
      `${getCustomEmoji('nexus_link')} : **[Get ${botName}](${inviteUrl})** | **[Website](${supportUrl})**\n\n` +
      `__**How do you use me?**__\n` +
      `\`\`\`/help <command/module> for more info regarding that command/module!\nExample: /help mute\`\`\`\n` +
      `### __**Main Modules:**__\n` +
      `> ${getCustomEmoji('nexus_shield')} \`:\` Antinuke Security\n` +
      `> ${getCustomEmoji('nexus_antiraid')} \`:\` Anti Betray ⭐\n` +
      `> ${getCustomEmoji('nexus_antinuke')} \`:\` Limit System ⭐\n` +
      `> ${getCustomEmoji('nexus_automod')} \`:\` Auto Emergency ⭐\n` +
      `> ${getCustomEmoji('nexus_shield')} \`:\` Emergency Safeguards\n` +
      `> ${getCustomEmoji('nexus_admin')} \`:\` Moderation\n` +
      `> ${getCustomEmoji('nexus_message')} \`:\` Utility & Direct Messages\n` +
      `> ${getCustomEmoji('nexus_automod')} \`:\` Automod Protection\n` +
      `> ${getCustomEmoji('nexus_logs')} \`:\` Welcoming & Logs\n` +
      `> ${getCustomEmoji('nexus_roles')} \`:\` Custom Roles & Nicknames\n` +
      `> ${getCustomEmoji('nexus_info')} \`:\` Giveaway ⭐\n` +
      `> ${getCustomEmoji('nexus_info')} \`:\` Boycott/VcBan ⭐\n` +
      `> ${getCustomEmoji('nexus_setting')} \`:\` Automations\n` +
      `> ${getCustomEmoji('nexus_info')} \`:\` Fun & Security\n` +
      `> ${getCustomEmoji('nexus_channel')} \`:\` Voice Controls\n` +
      `> ${getCustomEmoji('nexus_setting')} \`:\` Admin / Mod Setup\n` +
      `> ${getCustomEmoji('nexus_lock')} \`:\` Ignore Commands & Whitelist\n\n` +
      `-# **Use buttons to swap pages & menu to select help pages. Need help? Contact [Support](${supportUrl}) or email us at <contact@nexusbot.io>.**`
    );
  } else if (category === 'antinuke') {
    embed.setDescription(
      `### __**Main Module: Antinuke Security**__\n` +
      `> Protection engine enforcing thresholds against rogue administrator actions, mass channel wipes, role deletions, and unverified bot invites.\n\n` +
      `__**Commands List:**__\n` +
      `> \`/antinuke status\` \`:\` Inspect AntiNuke defense metrics and triggers\n` +
      `> \`/antinuke toggle <enabled>\` \`:\` Toggle AntiNuke protection guard\n` +
      `> \`/antinuke log <channel>\` \`:\` Configure AntiNuke security log channel\n` +
      `> \`/strip <user> [reason]\` \`:\` Emergency admin strip (instant role purge)\n\n` +
      `-# **Use menu below to switch help modules or contact [Support](${supportUrl}).**`
    );
  } else if (category === 'antiraid') {
    embed.setDescription(
      `### __**Main Module: Anti Betray & Anti-Raid Defense ⭐**__\n` +
      `> Anti-Raid shield monitoring rapid join velocity, new account age thresholds, and automated suspect quarantines.\n\n` +
      `__**Commands List:**__\n` +
      `> \`/antiraid status\` \`:\` View active AntiRaid burst limits and account age minimums\n` +
      `> \`/antiraid log <channel>\` \`:\` Set the AntiRaid alert channel\n` +
      `> \`/quarantine <user> <active>\` \`:\` Isolate or release a raid suspect member\n\n` +
      `-# **Use menu below to switch help modules or contact [Support](${supportUrl}).**`
    );
  } else if (category === 'automod') {
    embed.setDescription(
      `### __**Main Module: AutoMod Protection**__\n` +
      `> Realtime AI filter suppressing spam, invite links, malicious URLs, duplicate messages, and caps flooding.\n\n` +
      `__**Commands List:**__\n` +
      `> \`/automod status\` \`:\` View active AutoMod filters and penalty actions\n` +
      `> \`/automod toggle <enabled>\` \`:\` Toggle AutoMod filter engine\n` +
      `> \`/automod log <channel>\` \`:\` Configure AutoMod violation log channel\n` +
      `> \`/decensor <case_id>\` \`:\` Override or restore an AutoMod flagged message\n\n` +
      `-# **Use menu below to switch help modules or contact [Support](${supportUrl}).**`
    );
  } else if (category === 'moderation') {
    embed.setDescription(
      `### __**Main Module: Moderation Suite**__\n` +
      `> Full administrative toolset for server sanctions, message purges, timeouts, and channel locks.\n\n` +
      `__**Sanction Commands:**__\n` +
      `> \`/ban <user> [reason]\` \`:\` Permanently ban a member\n` +
      `> \`/tempban <user> <duration>\` \`:\` Temporarily ban a member\n` +
      `> \`/softban <user>\` \`:\` Ban and unban to purge member messages\n` +
      `> \`/kick <user> [reason]\` \`:\` Kick a member from the server\n` +
      `> \`/unban <user_id>\` \`:\` Revoke an active user ban\n` +
      `> \`/mute <user> <duration>\` \`:\` Place a member in timeout\n` +
      `> \`/unmute <user>\` \`:\` Lift active timeout\n` +
      `> \`/warn <user> <reason>\` \`:\` Issue formal rule warning\n` +
      `> \`/warnings [user]\` \`:\` Query member warning record\n` +
      `> \`/clearwarns <user>\` \`:\` Wipe warning history\n\n` +
      `__**Channel Control Commands:**__\n` +
      `> \`/lock [channel]\` \`:\` Lock channel for @everyone\n` +
      `> \`/unlock [channel]\` \`:\` Restore channel messaging\n` +
      `> \`/lockall\` \`:\` Emergency lock all text channels\n` +
      `> \`/unlockall\` \`:\` Unlock all text channels\n` +
      `> \`/purge <amount>\` \`:\` Mass delete up to 100 messages\n` +
      `> \`/slowmode <delay>\` \`:\` Adjust channel chat delay\n\n` +
      `-# **Use menu below to switch help modules or contact [Support](${supportUrl}).**`
    );
  } else if (category === 'utility') {
    embed.setDescription(
      `### __**Main Module: Utility & Direct Messaging**__\n` +
      `> Direct messaging suite, member security profile inspector, audit logs, and embed extraction.\n\n` +
      `__**Direct Messaging Commands:**__\n` +
      `> \`/dm <user> <message>\` \`:\` Send custom direct message to a user\n` +
      `> \`/dmroll <message> [role]\` \`:\` Send DM to a randomly selected member\n` +
      `> \`/dmglobal <message> [role]\` \`:\` Broadcast a DM to the entire server\n\n` +
      `__**Utility & Inspection Commands:**__\n` +
      `> \`/userinfo [user]\` \`:\` View security profile, warnings & joined date\n` +
      `> \`/serverinfo\` \`:\` View server metrics, channels & protection status\n` +
      `> \`/modlogs <moderator>\` \`:\` Search moderator audit execution logs\n` +
      `> \`/extractembed [msg_id]\` \`:\` Extract message embed into raw JSON\n` +
      `> \`/extract\` \`:\` Extract custom emojis as name = <:name:id>\n\n` +
      `-# **Use menu below to switch help modules or contact [Support](${supportUrl}).**`
    );
  } else if (category === 'voice') {
    embed.setDescription(
      `### __**Main Module: Voice Security & Controls**__\n` +
      `> Server voice channel controls and member audio restrictions.\n\n` +
      `__**Commands List:**__\n` +
      `> \`/voicemute <user>\` \`:\` Server mute member in voice channel\n` +
      `> \`/voiceunmute <user>\` \`:\` Lift server voice mute\n` +
      `> \`/voicekick <user>\` \`:\` Disconnect user from active voice channel\n` +
      `> \`/deafen <user>\` \`:\` Server deafen member in voice\n` +
      `> \`/undeafen <user>\` \`:\` Lift server voice deafen\n\n` +
      `-# **Use menu below to switch help modules or contact [Support](${supportUrl}).**`
    );
  } else if (category === 'admin') {
    embed.setDescription(
      `### __**Main Module: Admin Setup & Whitelist**__\n` +
      `> Server role assignment, bulk operations, logging channels, and whitelist bypass rules.\n\n` +
      `__**Commands List:**__\n` +
      `> \`/role <add|remove> <user> <role>\` \`:\` Grant or revoke a role\n` +
      `> \`/massrole <add|remove> <group> <role>\` \`:\` Bulk assign role to humans or bots\n` +
      `> \`/nick <user> [nickname]\` \`:\` Set or reset member nickname\n` +
      `> \`/whitelist <add|remove> [role] [user]\` \`:\` Manage bypass whitelist\n` +
      `> \`/logs log <channel>\` \`:\` Configure general server activity log channel\n\n` +
      `-# **Use menu below to switch help modules or contact [Support](${supportUrl}).**`
    );
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('help_category_select')
    .setPlaceholder(isDisabled ? 'Help menu disabled (Timed Out!)' : 'Select a category...')
    .setDisabled(isDisabled);

  if (isDisabled) {
    selectMenu.addOptions([
      {
        label: 'Help menu disabled (Timed Out!)',
        value: 'disabled',
        description: 'This help menu session has expired.'
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
        label: 'AutoMod Protection',
        description: 'Spam, link, and duplicate filter settings.',
        value: 'automod',
        emoji: getCustomEmojiObject('nexus_automod') || { name: '⚙️' }
      },
      {
        label: 'Moderation',
        description: 'Ban, kick, mute, lock, purge, warn commands.',
        value: 'moderation',
        emoji: getCustomEmojiObject('nexus_ban') || getCustomEmojiObject('nexus_kick') || { name: '🛠️' }
      },
      {
        label: 'Utility & DMs',
        description: 'Direct messages, userinfo, serverinfo & extract.',
        value: 'utility',
        emoji: getCustomEmojiObject('nexus_message') || getCustomEmojiObject('nexus_info') || { name: '📬' }
      },
      {
        label: 'Voice Security',
        description: 'Voice mute, voice kick, and deafen tools.',
        value: 'voice',
        emoji: getCustomEmojiObject('nexus_channel') || { name: '🎙️' }
      },
      {
        label: 'Admin Setup & Whitelist',
        description: 'Role management, logs, and whitelists.',
        value: 'admin',
        emoji: getCustomEmojiObject('nexus_admin') || getCustomEmojiObject('nexus_setting') || { name: '⚙️' }
      }
    ]);
  }

  const currentIndex = categoriesList.indexOf(category) !== -1 ? categoriesList.indexOf(category) : 0;
  const firstCategory = categoriesList[0];
  const lastCategory = categoriesList[categoriesList.length - 1];
  const prevCategory = categoriesList[(currentIndex - 1 + categoriesList.length) % categoriesList.length];
  const nextCategory = categoriesList[(currentIndex + 1) % categoriesList.length];

  // Button row matching requested style: ⏪ ◀️ ❌ ▶️ ⏩
  const btnRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`help_page_first_${firstCategory}`)
      .setEmoji('⏪')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isDisabled),
    new ButtonBuilder()
      .setCustomId(`help_page_prev_${prevCategory}`)
      .setEmoji('◀️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isDisabled),
    new ButtonBuilder()
      .setCustomId('help_page_close')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(isDisabled),
    new ButtonBuilder()
      .setCustomId(`help_page_next_${nextCategory}`)
      .setEmoji('▶️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isDisabled),
    new ButtonBuilder()
      .setCustomId(`help_page_last_${lastCategory}`)
      .setEmoji('⏩')
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

