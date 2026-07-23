/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmbedBuilder } from 'discord.js';
import { getGuildSettings } from '../storage.js';
import { statusEmoji } from './statusEmojis.js';
import { getEmoji } from './emojis.js';

/**
 * Common helper to safely fetch and send log embeds to a specified channel
 */
async function sendEmbedToChannel(guild, channelId, embed) {
  if (!channelId) return false;
  try {
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      console.warn(`[Logger] Log channel ${channelId} not found in guild ${guild.id}`);
      return false;
    }
    await channel.send({ embeds: [embed] }).catch(() => {});
    return true;
  } catch (err) {
    console.error(`[Logger] Failed to send log to channel ${channelId}:`, err.message);
    return false;
  }
}

/**
 * Log an AutoMod moderation action
 */
export async function logAutoModViolation(guild, user, channel, reason, action, messageContent = '') {
  const settings = getGuildSettings(guild.id);
  const logChannelId = settings?.automod?.logChannelId;
  if (!logChannelId) return;

  const shieldEmoji = statusEmoji('automod') || getEmoji('nexus_automod');
  const warnEmoji = statusEmoji('warning') || getEmoji('nexus_warn');
  const actionEmoji = action === 'ban' ? (statusEmoji('ban') || getEmoji('nexus_ban')) : 
                      action === 'kick' ? (statusEmoji('kick') || getEmoji('nexus_kick')) : 
                      action === 'timeout' ? (statusEmoji('timeout') || getEmoji('nexus_timeout')) : 
                      (statusEmoji('success') || getEmoji('nexus_checkmark'));

  const actionLabel = action === 'delete' ? 'DELETED MESSAGE' : `${action.toUpperCase()}ED USER`;

  const embed = new EmbedBuilder()
    .setTitle(`${shieldEmoji} Moderation System`)
    .setColor(0xED4245) // Professional Discord Red
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .setDescription(`AutoMod intercepted and resolved a policy violation in <#${channel.id}>.`)
    .addFields(
      { name: 'Violator', value: `<@${user.id}> (\`${user.tag}\`)\nID: \`${user.id}\``, inline: true },
      { name: 'Action Taken', value: `${actionEmoji} \`${actionLabel}\``, inline: true },
      { name: `Reason`, value: `\`${reason}\``, inline: false }
    )
    .setTimestamp();

  if (messageContent && messageContent.trim().length > 0) {
    const truncatedContent = messageContent.length > 500 
      ? messageContent.substring(0, 497) + '...' 
      : messageContent;
    embed.addFields({ name: 'Flagged Content', value: `\`\`\`${truncatedContent.replace(/`/g, '`\u200b')}\`\`\`` });
  }

  embed.setFooter({
    text: `Nexus Bot • AutoMod Log`,
    iconURL: guild.iconURL() || undefined
  });

  await sendEmbedToChannel(guild, logChannelId, embed);
}

/**
 * Log a Warning limit reached action
 */
export async function logWarnLimitReached(guild, user, maxLimit, punishmentAction) {
  const settings = getGuildSettings(guild.id);
  const logChannelId = settings?.automod?.logChannelId;
  if (!logChannelId) return;

  const shieldEmoji = statusEmoji('shield') || getEmoji('nexus_shield');
  const warnEmoji = statusEmoji('warning') || getEmoji('nexus_warn');
  const actionEmoji = punishmentAction === 'ban' ? (statusEmoji('ban') || getEmoji('nexus_ban')) : 
                      punishmentAction === 'kick' ? (statusEmoji('kick') || getEmoji('nexus_kick')) : 
                      punishmentAction === 'timeout' ? (statusEmoji('timeout') || getEmoji('nexus_timeout')) : 
                      getEmoji('nexus_command');

  const actionLabel = punishmentAction === 'none' ? 'NONE (LOG ONLY)' : punishmentAction.toUpperCase();

  const embed = new EmbedBuilder()
    .setTitle(`${shieldEmoji} Warn Punishment Limit Reached`)
    .setColor(0xF59E0B) // Amber/Yellow
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .setDescription(`<@${user.id}> has accumulated **${maxLimit}** active warnings in the server.`)
    .addFields(
      { name: 'Member', value: `<@${user.id}> (\`${user.tag}\`)\nID: \`${user.id}\``, inline: true },
      { name: `Warnings Limit`, value: `\`${maxLimit} Active Warnings\``, inline: true },
      { name: 'Punishment Applied', value: `${actionEmoji} \`${actionLabel}\``, inline: true }
    )
    .setTimestamp()
    .setFooter({
      text: `Nexus Bot • Warning Threshold Reset`,
      iconURL: guild.iconURL() || undefined
    });

  await sendEmbedToChannel(guild, logChannelId, embed);
}

/**
 * Log an AntiRaid event
 */
export async function logAntiRaidTrigger(guild, user, reason, action, detailText = '') {
  const settings = getGuildSettings(guild.id);
  const logChannelId = settings?.antiraid?.logChannelId;
  if (!logChannelId) return;

  const raidEmoji = statusEmoji('raid') || getEmoji('nexus_raid');
  const shieldEmoji = statusEmoji('shield') || getEmoji('nexus_shield');
  const actionEmoji = action === 'ban' ? (statusEmoji('ban') || getEmoji('nexus_ban')) : 
                      action === 'kick' ? (statusEmoji('kick') || getEmoji('nexus_kick')) : 
                      action === 'timeout' ? (statusEmoji('timeout') || getEmoji('nexus_timeout')) : 
                      getEmoji('nexus_lock');

  const embed = new EmbedBuilder()
    .setTitle(`${raidEmoji} Anti-Raid Active Defense Alert`)
    .setColor(0xEE5A24) // Dynamic Vibrant Orange
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .setDescription(`Anti-Raid defense protocols have quarantined a suspicious user session.`)
    .addFields(
      { name: 'Suspicious Member', value: `<@${user.id}> (\`${user.tag}\`)\nID: \`${user.id}\``, inline: true },
      { name: 'Threat Policy', value: `\`${reason}\``, inline: true },
      { name: 'Defense Enforcement', value: `${actionEmoji} \`${action.toUpperCase()}\``, inline: true }
    )
    .setTimestamp();

  if (detailText) {
    embed.addFields({ name: 'Metadata & Context', value: detailText });
  }

  embed.setFooter({
    text: `Nexus Bot • Anti-Raid Log`,
    iconURL: guild.iconURL() || undefined
  });

  await sendEmbedToChannel(guild, logChannelId, embed);
}

/**
 * Log an AntiNuke Admin Abuse shield event
 */
export async function logAntiNukeTrigger(guild, executor, violationType, actionType, count, threshold, detailText = '') {
  const settings = getGuildSettings(guild.id);
  const logChannelId = settings?.antinuke?.logChannelId;
  if (!logChannelId) return;

  const shieldEmoji = statusEmoji('shield') || getEmoji('nexus_shield');
  const nukeEmoji = statusEmoji('nuke') || getEmoji('nexus_nuke');
  const dangerEmoji = statusEmoji('warning') || getEmoji('nexus_warn');

  const adminTag = executor ? executor.tag : 'Unknown Operator';
  const adminId = executor ? executor.id : 'N/A';
  const adminMention = executor ? `<@${executor.id}>` : '`Unknown`';

  const actionEmoji = actionType === 'ban' ? (statusEmoji('ban') || getEmoji('nexus_ban')) : 
                      actionType === 'kick' ? (statusEmoji('kick') || getEmoji('nexus_kick')) : 
                      actionType === 'timeout' ? (statusEmoji('timeout') || getEmoji('nexus_timeout')) : 
                      getEmoji('nexus_shield');

  const embed = new EmbedBuilder()
    .setTitle(`${nukeEmoji} Rogue Administrator Abuse Shield Triggered`)
    .setColor(0xEA2027) // Intense Red for rogue admins
    .setDescription(`${dangerEmoji} **CRITICAL SECURITY VIOLATION ENCOUNTERED**`)
    .addFields(
      { name: 'Security Breach', value: `\`${violationType}\``, inline: true },
      { name: 'Velocity / Limit', value: `\`${count} actions / ${threshold} limit\``, inline: true },
      { name: 'Safeguard Penalty', value: `${actionEmoji} \`${actionType.toUpperCase()}\``, inline: true },
      { name: 'Offending Admin', value: `${adminMention} (\`${adminTag}\`)\nID: \`${adminId}\``, inline: false }
    )
    .setTimestamp();

  if (detailText) {
    embed.addFields({ name: 'Enforcement Details', value: detailText });
  }

  embed.setFooter({
    text: `Nexus Bot • Rogue Safeguard Activated`,
    iconURL: guild.iconURL() || undefined
  });

  await sendEmbedToChannel(guild, logChannelId, embed);
}

/**
 * Log general Discord activity (channel edits, category edits, role additions/removals, member events, message edits/deletes)
 */
export async function logActivity(guild, title, description, fields = [], color = 0x5865F2, thumbnail = null) {
  if (!guild) return;
  const settings = getGuildSettings(guild.id);
  const logChannelId = settings?.logging?.logChannelId || settings?.logs?.logChannelId;
  if (!logChannelId) return;

  const logsIcon = statusEmoji('logs') || statusEmoji('channel') || getEmoji('nexus_logs') || '📜';

  const embed = new EmbedBuilder()
    .setTitle(`${logsIcon} ${title}`)
    .setColor(color)
    .setDescription(description)
    .setTimestamp();

  if (thumbnail) {
    embed.setThumbnail(thumbnail);
  }

  if (fields && fields.length > 0) {
    embed.addFields(fields);
  }

  embed.setFooter({
    text: `Nexus Bot • Activity Log`,
    iconURL: guild.iconURL() || undefined
  });

  await sendEmbedToChannel(guild, logChannelId, embed);
}
