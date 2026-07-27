/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { getCustomEmoji, getCustomEmojiObject } from './customEmojis.js';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

/**
 * Builds the interactive /userinfo embed and category select menu.
 * @param {import('discord.js').Guild} guild 
 * @param {import('discord.js').User} targetUser 
 * @param {string} category - 'general', 'stats', 'roles', or 'avatar'
 * @param {import('discord.js').User} requester 
 */
export async function getUserInfoEmbedAndComponents(guild, targetUser, category = 'general', requester = null) {
  const member = await guild.members.fetch(targetUser.id).catch(() => null);

  const embed = new EmbedBuilder().setColor('#27272f');

  const avatarUrl = targetUser.displayAvatarURL({ dynamic: true, size: 1024 });
  const avatarThumbnail = targetUser.displayAvatarURL({ dynamic: true, size: 256 });

  const pad = (n) => String(n).padStart(2, '0');
  const createdDate = targetUser.createdAt;
  const createdDateStr = `${createdDate.getUTCFullYear()}-${pad(createdDate.getUTCMonth() + 1)}-${pad(createdDate.getUTCDate())} ${pad(createdDate.getUTCHours())}:${pad(createdDate.getUTCMinutes())}:${pad(createdDate.getUTCSeconds())}`;

  const requestedBy = requester ? requester.username || requester.tag : targetUser.username;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  embed.setFooter({ text: `Requested by ${requestedBy} | Today at ${timeStr}` });

  const userIcon = getCustomEmoji('nexus_user') || '👤';
  const idIcon = getCustomEmoji('nexus_ID') || '🆔';
  const dateIcon = getCustomEmoji('nexus_date') || '📅';
  const rolesIcon = getCustomEmoji('nexus_roles') || '🎭';
  const shieldIcon = getCustomEmoji('nexus_shield') || '🛡️';
  const linkIcon = getCustomEmoji('nexus_link') || '🖼️';
  const statsIcon = getCustomEmoji('nexus_stats') || '📊';

  if (category === 'stats') {
    embed.setThumbnail(avatarThumbnail);
    embed.setTitle(`${shieldIcon} Member Stats — ${targetUser.username}`);

    let userWarns = [];
    if (guild) {
      const warningsPath = path.join(DATA_DIR, guild.id, 'warnings.json');
      try {
        const raw = fs.readFileSync(warningsPath, 'utf8');
        const warnings = JSON.parse(raw);
        userWarns = warnings.filter(w => w.memberId === targetUser.id && w.active !== false);
      } catch (e) {}
    }

    const isTimedOut = member?.isCommunicationDisabled?.();
    const timeoutUntil = isTimedOut ? `<t:${Math.floor(member.communicationDisabledUntil.getTime() / 1000)}:R>` : 'None';
    const nickname = member?.nickname ? member.nickname : 'None';
    const booster = member?.premiumSince ? `💖 Since <t:${Math.floor(member.premiumSince.getTime() / 1000)}:R>` : 'No Boost';
    const ruleScreening = member?.pending ? '⚠️ Pending' : '✅ Passed';

    embed.addFields(
      { name: `${userIcon} Server Nickname`, value: nickname, inline: true },
      { name: `${shieldIcon} Active Warnings`, value: `\`${userWarns.length}\``, inline: true },
      { name: `${statsIcon} Timeout Status`, value: isTimedOut ? `⏳ Muted until ${timeoutUntil}` : '✅ Normal', inline: true },
      { name: `${dateIcon} Server Booster`, value: booster, inline: true },
      { name: `${shieldIcon} Rule Screening`, value: ruleScreening, inline: true }
    );
  } else if (category === 'roles') {
    embed.setThumbnail(avatarThumbnail);
    const sortedRoles = member?.roles?.cache
      ?.filter(r => r.name !== '@everyone')
      ?.sort((a, b) => b.position - a.position)
      ?.map(r => `<@&${r.id}>`) || [];

    embed.setTitle(`${rolesIcon} Roles [${sortedRoles.length}] — ${targetUser.username}`);

    if (sortedRoles.length > 0) {
      let roleText = sortedRoles.join(', ');
      if (roleText.length > 1024) {
        roleText = roleText.substring(0, 1000) + '... and more';
      }
      embed.addFields({ name: `${rolesIcon} Assigned Roles`, value: roleText, inline: false });
    } else {
      embed.addFields({ name: `${rolesIcon} Assigned Roles`, value: 'No roles assigned', inline: false });
    }
  } else if (category === 'avatar') {
    embed.setTitle(`${linkIcon} User Icon / Avatar — ${targetUser.username}`);
    embed.setImage(avatarUrl);

    const png = targetUser.displayAvatarURL({ format: 'png', size: 1024 });
    const jpg = targetUser.displayAvatarURL({ format: 'jpg', size: 1024 });
    const webp = targetUser.displayAvatarURL({ format: 'webp', size: 1024 });

    embed.addFields({
      name: `${linkIcon} Download Avatar Links`,
      value: `[PNG](${png}) | [JPG](${jpg}) | [WEBP](${webp})`,
      inline: false
    });
  } else {
    // Default: 'general'
    embed.setThumbnail(avatarThumbnail);
    embed.setTitle(`${userIcon} General Info — ${targetUser.username}`);

    const createdAtTs = `<t:${Math.floor(targetUser.createdAt.getTime() / 1000)}:R>`;
    const joinedAtTs = member?.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>` : 'Not in server';
    const topRole = member?.roles?.highest ? `<@&${member.roles.highest.id}>` : 'None';

    embed.addFields(
      { name: `${userIcon} User Tag`, value: `${targetUser.username}`, inline: true },
      { name: `${idIcon} User ID`, value: `\`${targetUser.id}\``, inline: true },
      { name: `${userIcon} Bot Account`, value: targetUser.bot ? '🤖 Yes' : '👤 No', inline: true },
      { name: `${dateIcon} Account Created`, value: `${createdDateStr}\n(${createdAtTs})`, inline: true },
      { name: `${dateIcon} Joined Server`, value: joinedAtTs, inline: true },
      { name: `${rolesIcon} Top Role`, value: topRole, inline: true }
    );
  }

  // Category select menu
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`userinfo_category_select_${targetUser.id}`)
    .setPlaceholder('Select user info category...')
    .addOptions([
      {
        label: 'General Info',
        value: 'userinfo_general',
        description: 'View user profile & creation details',
        emoji: getCustomEmojiObject('nexus_user') || { name: '👤' }
      },
      {
        label: 'Member Stats',
        value: 'userinfo_stats',
        description: 'View warnings, timeout & server status',
        emoji: getCustomEmojiObject('nexus_stats') || { name: '📊' }
      },
      {
        label: 'Roles',
        value: 'userinfo_roles',
        description: 'View assigned server roles',
        emoji: getCustomEmojiObject('nexus_roles') || { name: '🎭' }
      },
      {
        label: 'User Icon / Avatar',
        value: 'userinfo_avatar',
        description: 'View full size user avatar image & links',
        emoji: getCustomEmojiObject('nexus_link') || { name: '🖼️' }
      }
    ]);

  const row = new ActionRowBuilder().addComponents(menu);

  return { embeds: [embed], components: [row] };
}
