// nexus bot
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { getCustomEmoji, getCustomEmojiObject } from './customEmojis.js';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data', 'guilds');

/**
 * Helper to get custom emoji string without fallback unicode emojis
 */
function emoji(key) {
  const e = getCustomEmoji(key);
  return (e && !e.startsWith(':')) ? e : '';
}

/**
 * Builds the interactive /userinfo embed and select menu.
 * @param {import('discord.js').Guild} guild 
 * @param {import('discord.js').User} targetUser 
 * @param {string} category - 'general', 'roles', or 'avatar'
 * @param {import('discord.js').User} requestingUser 
 */
export async function getUserInfoEmbedAndComponents(guild, targetUser, category = 'general', requestingUser = null) {
  const embed = new EmbedBuilder().setColor('#27272f');

  if (targetUser.displayAvatarURL()) {
    embed.setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }));
  }

  const member = await guild.members.fetch(targetUser.id).catch(() => null);

  // Fetch warnings
  let userWarnsCount = 0;
  try {
    const warningsPath = path.join(DATA_DIR, guild.id, 'warnings.json');
    if (fs.existsSync(warningsPath)) {
      const warnings = JSON.parse(fs.readFileSync(warningsPath, 'utf8'));
      userWarnsCount = warnings.filter(w => w.memberId === targetUser.id && w.active !== false).length;
    }
  } catch (e) {
    // ignore
  }

  const joinedAtStr = member?.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>` : 'Unknown';
  const createdAtStr = `<t:${Math.floor(targetUser.createdAt.getTime() / 1000)}:R>`;
  const isTimedOut = member?.isCommunicationDisabled?.();
  const timeoutUntil = isTimedOut ? `<t:${Math.floor(member.communicationDisabledUntil.getTime() / 1000)}:R>` : 'None';

  // Format timestamp for footer: "Requested by username | Today at HH:MM PM"
  const requestedBy = requestingUser ? requestingUser.username || requestingUser.tag : 'User';
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  embed.setFooter({ text: `Requested by ${requestedBy} | Today at ${timeStr}` });

  const userIcon = emoji('nexus_user');
  const idIcon = emoji('nexus_ID');
  const dateIcon = emoji('nexus_date');
  const joinIcon = emoji('nexus_join');
  const rolesIcon = emoji('nexus_roles');
  const shieldIcon = emoji('nexus_shield');
  const warnIcon = emoji('nexus_warning');
  const linkIcon = emoji('nexus_link');
  const adminIcon = emoji('nexus_admin');

  const p = (e) => e ? `${e} ` : '';

  if (category === 'avatar') {
    embed.setTitle(`${p(userIcon)}Avatar - ${targetUser.username}`);
    const avatarUrl = targetUser.displayAvatarURL({ dynamic: true, size: 1024 });
    embed.setImage(avatarUrl);

    const png = targetUser.displayAvatarURL({ extension: 'png', size: 1024 });
    const jpg = targetUser.displayAvatarURL({ extension: 'jpg', size: 1024 });
    const webp = targetUser.displayAvatarURL({ extension: 'webp', size: 1024 });
    const isAnimated = targetUser.avatar?.startsWith('a_');
    const gif = isAnimated ? targetUser.displayAvatarURL({ extension: 'gif', size: 1024 }) : null;

    let links = `${p(linkIcon)}[PNG](${png}) | [JPG](${jpg}) | [WEBP](${webp})`;
    if (gif) links += ` | [GIF](${gif})`;

    embed.setDescription(links);
  } else if (category === 'roles') {
    embed.setTitle(`${p(rolesIcon)}Roles & Permissions - ${targetUser.username}`);

    const sortedRoles = member?.roles?.cache
      ?.filter(r => r.name !== '@everyone')
      ?.sort((a, b) => b.position - a.position);

    const rolesList = sortedRoles && sortedRoles.size > 0
      ? sortedRoles.map(r => `<@&${r.id}>`).join(', ')
      : 'No roles assigned';

    const topRole = member?.roles?.highest ? `<@&${member.roles.highest.id}>` : 'None';

    embed.setDescription(
      `${p(rolesIcon)}**Top Role**: ${topRole}\n\n` +
      `${p(rolesIcon)}**Roles List**: ${rolesList}`
    );

    // Key permissions
    if (member) {
      const perms = [];
      if (member.permissions.has('Administrator')) perms.push('Administrator');
      if (member.permissions.has('ManageGuild')) perms.push('Manage Server');
      if (member.permissions.has('ManageRoles')) perms.push('Manage Roles');
      if (member.permissions.has('ManageChannels')) perms.push('Manage Channels');
      if (member.permissions.has('KickMembers')) perms.push('Kick Members');
      if (member.permissions.has('BanMembers')) perms.push('Ban Members');
      if (member.permissions.has('ManageMessages')) perms.push('Manage Messages');

      const permStr = perms.length > 0 ? perms.join(', ') : 'Standard Permissions';
      embed.addFields({ name: `${p(adminIcon)}Key Permissions`, value: permStr, inline: false });
    }
  } else {
    // Default / 'general'
    embed.setTitle(`${p(userIcon)}Member Profile - ${targetUser.username}`);

    embed.setDescription(
      `${p(userIcon)}**User**: <@${targetUser.id}> (${targetUser.tag || targetUser.username})\n` +
      `${p(shieldIcon)}**Bot Account**: ${targetUser.bot ? 'Yes' : 'No'}`
    );

    embed.addFields(
      { name: `${p(idIcon)}User ID`, value: `\`${targetUser.id}\``, inline: true },
      { name: `${p(dateIcon)}Account Created`, value: createdAtStr, inline: true },
      { name: `${p(joinIcon)}Joined Server`, value: joinedAtStr, inline: true },
      { name: `${p(warnIcon)}Active Warnings`, value: `\`${userWarnsCount}\``, inline: true },
      { name: `${p(shieldIcon)}Timeout Status`, value: isTimedOut ? `Muted until ${timeoutUntil}` : 'Active', inline: true }
    );
  }

  // Select menu
  const menuOptions = [
    {
      label: 'General Info',
      value: `userinfo_general_${targetUser.id}`
    },
    {
      label: 'Roles & Permissions',
      value: `userinfo_roles_${targetUser.id}`
    },
    {
      label: 'Avatar',
      value: `userinfo_avatar_${targetUser.id}`
    }
  ];

  const userEmojiObj = getCustomEmojiObject('nexus_user');
  const rolesEmojiObj = getCustomEmojiObject('nexus_roles');
  const linkEmojiObj = getCustomEmojiObject('nexus_link');

  if (userEmojiObj) menuOptions[0].emoji = userEmojiObj;
  if (rolesEmojiObj) menuOptions[1].emoji = rolesEmojiObj;
  if (linkEmojiObj) menuOptions[2].emoji = linkEmojiObj;

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`userinfo_category_select_${targetUser.id}`)
    .setPlaceholder('Select user info category')
    .addOptions(menuOptions);

  const row = new ActionRowBuilder().addComponents(menu);

  return { embeds: [embed], components: [row] };
}
