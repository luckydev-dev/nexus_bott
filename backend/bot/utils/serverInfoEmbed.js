/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { getCustomEmoji, getCustomEmojiObject } from './customEmojis.js';

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

  if (category === 'stats') {
    const icon = getCustomEmoji('nexus_stats') || '📁';
    const shieldIcon = getCustomEmoji('nexus_shield') || '🛡️';
    const channelIcon = getCustomEmoji('nexus_channel') || '💬';
    const rolesIcon = getCustomEmoji('nexus_roles') || '🎭';
    const emojisIcon = getCustomEmoji('nexus_emojis') || '😃';
    const infoIcon = getCustomEmoji('nexus_info') || '✨';

    embed.setTitle(`${icon} Server Statistics`);

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
      { name: `${shieldIcon} Verification Level`, value: verifStr, inline: true },
      { name: `${channelIcon} Channels`, value: `${channelsCount}`, inline: true },
      { name: `${rolesIcon} Roles`, value: `${rolesCount}`, inline: true },
      { name: `${emojisIcon} Emojis`, value: `${emojisCount}`, inline: true },
      { name: `${infoIcon} Boosts`, value: `Level ${boostTier} (${boostCount} boosts)`, inline: true }
    );
  } else if (category === 'roles') {
    const sortedRoles = guild.roles.cache.sort((a, b) => b.position - a.position);
    const icon = getCustomEmoji('nexus_roles') || '🎭';
    embed.setTitle(`${icon} Roles [${sortedRoles.size}]`);

    const roleMentions = sortedRoles.map(r => `<@&${r.id}>`).join('\n');
    let desc = roleMentions;
    if (desc.length > 2000) {
      desc = desc.substring(0, 1950) + '\n...and more roles';
    }
    embed.setDescription(desc || 'No roles found.');
  } else {
    // Default / 'general'
    const icon = getCustomEmoji('nexus_server') || '🌐';
    const serverIcon = getCustomEmoji('nexus_server') || '🌐';
    const idIcon = getCustomEmoji('nexus_ID') || '🆔';
    const ownerIcon = getCustomEmoji('nexus_owner') || '👑';
    const dateIcon = getCustomEmoji('nexus_date') || '📅';
    const userIcon = getCustomEmoji('nexus_user') || '👥';

    embed.setTitle(`${icon} General Info ${guild.name}`);

    embed.addFields(
      { name: `${serverIcon} Server Name`, value: guild.name, inline: true },
      { name: `${idIcon} Server ID`, value: `\`${guild.id}\``, inline: true },
      { name: `${ownerIcon} Owner`, value: `${ownerMention}${ownerTag}`, inline: false },
      { name: `${dateIcon} Created`, value: dateStr, inline: true },
      { name: `${userIcon} Members`, value: `${guild.memberCount}`, inline: true }
    );
  }

  // Select Menu below the embed
  const menu = new StringSelectMenuBuilder()
    .setCustomId('serverinfo_category_select')
    .setPlaceholder('Select server info category')
    .addOptions([
      {
        label: 'General Info',
        value: 'serverinfo_general',
        emoji: getCustomEmojiObject('nexus_server') || { name: '🌐' }
      },
      {
        label: 'Statistics',
        value: 'serverinfo_stats',
        emoji: getCustomEmojiObject('nexus_stats') || { name: '📁' }
      },
      {
        label: 'Roles',
        value: 'serverinfo_roles',
        emoji: getCustomEmojiObject('nexus_roles') || { name: '🎭' }
      }
    ]);

  const row = new ActionRowBuilder().addComponents(menu);

  return { embeds: [embed], components: [row] };
}
