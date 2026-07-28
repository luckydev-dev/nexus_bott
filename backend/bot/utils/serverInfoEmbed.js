/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { getCustomEmoji, getCustomEmojiObject } from './customEmojis.js';

/**
 * Helper to get custom emoji string without fallback unicode emojis
 */
function emoji(key) {
  const e = getCustomEmoji(key);
  return (e && !e.startsWith(':')) ? e : '';
}

/**
 * Builds the interactive /serverinfo embed and select menu.
 * @param {import('discord.js').Guild} guild 
 * @param {string} category - 'general', 'stats', or 'roles'
 * @param {import('discord.js').User} user 
 */
export async function getServerInfoEmbedAndComponents(guild, category = 'general', user = null) {
  try {
    await guild.members.fetch().catch(() => {});
    await guild.roles.fetch().catch(() => {});
    await guild.channels.fetch().catch(() => {});
  } catch (e) {
    // Ignore fetch errors
  }

  const embed = new EmbedBuilder().setColor('#27272f');

  if (guild.iconURL()) {
    embed.setThumbnail(guild.iconURL({ dynamic: true, size: 256 }));
  }

  const owner = await guild.fetchOwner().catch(() => null);
  const ownerMention = owner ? `<@${owner.id}>` : 'Unknown';
  const ownerTag = owner ? ` (${owner.id})` : '';

  // Format creation date: YYYY-MM-DD HH:MM:SS
  const createdDate = guild.createdAt;
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = `${createdDate.getUTCFullYear()}-${pad(createdDate.getUTCMonth() + 1)}-${pad(createdDate.getUTCDate())} ${pad(createdDate.getUTCHours())}:${pad(createdDate.getUTCMinutes())}:${pad(createdDate.getUTCSeconds())}`;

  // Format timestamp for footer: "Requested by username | Today at HH:MM PM"
  const requestedBy = user ? user.username || user.tag : guild.name;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  embed.setFooter({ text: `Requested by ${requestedBy} | Today at ${timeStr}` });

  const p = (e) => e ? `${e} ` : '';

  if (category === 'stats') {
    const icon = emoji('nexus_stats');
    const shieldIcon = emoji('nexus_shield');
    const channelIcon = emoji('nexus_channel');
    const rolesIcon = emoji('nexus_roles');
    const emojisIcon = emoji('nexus_emojis');
    const infoIcon = emoji('nexus_info');

    embed.setTitle(`${p(icon)}Server Statistics`);

    const verifLevels = {
      0: 'None',
      1: 'Low',
      2: 'Medium',
      3: 'High',
      4: 'Very High'
    };
    const verifStr = verifLevels[guild.verificationLevel] || 'None';
    const channelsCount = guild.channels.cache.size;
    const rolesCount = guild.roles.cache.size;
    const emojisCount = guild.emojis.cache.size;
    const boostTier = guild.premiumTier || 0;
    const boostCount = guild.premiumSubscriptionCount || 0;

    embed.addFields(
      { name: `${p(shieldIcon)}Verification Level`, value: verifStr, inline: true },
      { name: `${p(channelIcon)}Channels`, value: `${channelsCount}`, inline: true },
      { name: `${p(rolesIcon)}Roles`, value: `${rolesCount}`, inline: true },
      { name: `${p(emojisIcon)}Emojis`, value: `${emojisCount}`, inline: true },
      { name: `${p(infoIcon)}Boosts`, value: `Level ${boostTier} (${boostCount} boosts)`, inline: true }
    );
  } else if (category === 'roles') {
    const sortedRoles = guild.roles.cache.sort((a, b) => b.position - a.position);
    const icon = emoji('nexus_roles');
    embed.setTitle(`${p(icon)}Roles [${sortedRoles.size}]`);

    const roleMentions = sortedRoles.map(r => `<@&${r.id}>`).join('\n');
    let desc = roleMentions;
    if (desc.length > 2000) {
      desc = desc.substring(0, 1950) + '\n...and more roles';
    }
    embed.setDescription(desc || 'No roles found.');
  } else {
    // Default / 'general'
    const icon = emoji('nexus_server');
    const serverIcon = emoji('nexus_server');
    const idIcon = emoji('nexus_ID');
    const ownerIcon = emoji('nexus_owner');
    const dateIcon = emoji('nexus_date');
    const userIcon = emoji('nexus_user');

    embed.setTitle(`${p(icon)}General Info ${guild.name}`);

    // Move SOME info in description, SOME in fields
    embed.setDescription(
      `${p(serverIcon)}**Server Name**: ${guild.name}\n` +
      `${p(ownerIcon)}**Owner**: ${ownerMention}${ownerTag}`
    );

    embed.addFields(
      { name: `${p(idIcon)}Server ID`, value: `\`${guild.id}\``, inline: true },
      { name: `${p(dateIcon)}Created`, value: dateStr, inline: true },
      { name: `${p(userIcon)}Members`, value: `${guild.memberCount}`, inline: true }
    );
  } else if (category === 'icon' || category === 'servericon') {
    const icon = emoji('nexus_link') || emoji('nexus_server');
    embed.setTitle(`${p(icon)}Server Icon - ${guild.name}`);
    const iconUrl = guild.iconURL({ dynamic: true, size: 1024 });
    if (iconUrl) {
      embed.setImage(iconUrl);
      const png = guild.iconURL({ extension: 'png', size: 1024 });
      const jpg = guild.iconURL({ extension: 'jpg', size: 1024 });
      const webp = guild.iconURL({ extension: 'webp', size: 1024 });
      const isAnimated = guild.icon?.startsWith('a_');
      const gif = isAnimated ? guild.iconURL({ extension: 'gif', size: 1024 }) : null;

      let links = `${p(emoji('nexus_link'))}[PNG](${png}) | [JPG](${jpg}) | [WEBP](${webp})`;
      if (gif) links += ` | [GIF](${gif})`;
      embed.setDescription(links);
    } else {
      embed.setDescription('This server does not have an icon.');
    }
  }

  // Select Menu below the embed
  const menuOptions = [
    {
      label: 'General Info',
      value: 'serverinfo_general'
    },
    {
      label: 'Statistics',
      value: 'serverinfo_stats'
    },
    {
      label: 'Roles',
      value: 'serverinfo_roles'
    },
    {
      label: 'Server Icon',
      value: 'serverinfo_icon'
    }
  ];

  const serverEmojiObj = getCustomEmojiObject('nexus_server');
  const statsEmojiObj = getCustomEmojiObject('nexus_stats');
  const rolesEmojiObj = getCustomEmojiObject('nexus_roles');
  const linkEmojiObj = getCustomEmojiObject('nexus_link');

  if (serverEmojiObj) menuOptions[0].emoji = serverEmojiObj;
  if (statsEmojiObj) menuOptions[1].emoji = statsEmojiObj;
  if (rolesEmojiObj) menuOptions[2].emoji = rolesEmojiObj;
  if (linkEmojiObj) menuOptions[3].emoji = linkEmojiObj;

  const menu = new StringSelectMenuBuilder()
    .setCustomId('serverinfo_category_select')
    .setPlaceholder('Select server info category')
    .addOptions(menuOptions);

  const row = new ActionRowBuilder().addComponents(menu);

  return { embeds: [embed], components: [row] };
}
