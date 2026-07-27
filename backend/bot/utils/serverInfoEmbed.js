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

  const embed = new EmbedBuilder().setColor('#3B82F6');

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

    embed.setDescription(
      `__**Server Statistics**__\n` +
      `**Verification Level**: ${verifStr}\n` +
      `**Channels**: ${channelsCount}\n` +
      `**Roles**: ${rolesCount}\n` +
      `**Emojis**: ${emojisCount}\n` +
      `**Boosts**: Level ${boostTier} (${boostCount} boosts)`
    );
  } else if (category === 'roles') {
    const sortedRoles = guild.roles.cache.sort((a, b) => b.position - a.position);
    const icon = getCustomEmoji('nexus_admin') || '🔧';
    embed.setTitle(`${icon} Roles [${sortedRoles.size}]`);

    const roleMentions = sortedRoles.map(r => `<@&${r.id}>`).join('\n');
    let desc = roleMentions;
    if (desc.length > 2000) {
      desc = desc.substring(0, 1950) + '\n...and more roles';
    }
    embed.setDescription(desc || 'No roles found.');
  } else {
    // Default / 'general'
    const icon = getCustomEmoji('nexus_settings') || '⚙️';
    embed.setTitle(`${icon} General Info ${guild.name}`);

    embed.setDescription(
      `__**General Info**__\n` +
      `**Name**: ${guild.name}\n` +
      `**Server ID**: ${guild.id}\n` +
      `**Owner**: ${ownerMention}${ownerTag}\n` +
      `**Created**: ${dateStr}\n` +
      `**Members**: ${guild.memberCount}`
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
        emoji: getCustomEmojiObject('nexus_settings') || { name: '⚙️' }
      },
      {
        label: 'Statistics',
        value: 'serverinfo_stats',
        emoji: getCustomEmojiObject('nexus_stats') || { name: '📁' }
      },
      {
        label: 'Roles',
        value: 'serverinfo_roles',
        emoji: getCustomEmojiObject('nexus_admin') || { name: '🔧' }
      }
    ]);

  const row = new ActionRowBuilder().addComponents(menu);

  return { embeds: [embed], components: [row] };
}
