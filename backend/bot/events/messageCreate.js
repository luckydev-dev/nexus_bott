/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmbedBuilder, PermissionFlagsBits, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { getGuildSettings, addGuildAudit, DATA_DIR } from '../storage.js';
import { getEmoji } from '../utils/emojis.js';
import { getCustomEmoji } from '../utils/customEmojis.js';
import { statusEmoji } from '../utils/statusEmojis.js';
import { logAutoModViolation, logWarnLimitReached } from '../utils/logger.js';
import { issueWarning } from '../utils/warnings.js';

import { getHelpEmbedAndComponents, setHelpTimeout } from '../utils/helpEmbed.js';
import { getServerInfoEmbedAndComponents } from '../utils/serverInfoEmbed.js';

// In-memory message tracker for Anti-Spam
const messageTimestamps = new Map();
const lastUserMessage = new Map(); // tracks last message content for duplicate spam check
const lastAlertTimestamps = new Map();

// Helper functions for prefix commands
async function parseMember(guild, arg) {
  if (!arg) return null;
  const match = arg.match(/^<@!?(\d+)>$/) || arg.match(/^(\d+)$/);
  if (match) {
    return guild.members.fetch(match[1]).catch(() => null);
  }
  return null;
}

function parseRole(guild, arg) {
  if (!arg) return null;
  const match = arg.match(/^<@&(\d+)>$/) || arg.match(/^(\d+)$/);
  if (match) {
    return guild.roles.cache.get(match[1]) || null;
  }
  return guild.roles.cache.find(r => r.name.toLowerCase() === arg.toLowerCase()) || null;
}

function parseDuration(durationStr) {
  if (!durationStr) return null;
  const match = durationStr.match(/^(\d+)([smhd])$/i);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case 's': return num * 1000;
    case 'm': return num * 60 * 1000;
    case 'h': return num * 60 * 60 * 1000;
    case 'd': return num * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

async function handlePrefixCommand(message, settings) {
  const prefix = settings?.prefix || '!';

  // Check if message is a mention of the bot
  const botMentionRegex = new RegExp(`^<@!?${message.client.user.id}>$`);
  if (botMentionRegex.test(message.content.trim())) {
    const clientId = message.client.user?.id || process.env.DISCORD_CLIENT_ID || '1528216029816426608';
    const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=2113268958&scope=bot`;
    const supportUrl = 'https://discord.gg/8hbsvybVGs';
    const webUrl = 'https://nexusbot.dev';

    const arrowIcon = getCustomEmoji('nexus_arrowright') || '➔';

    const embed = new EmbedBuilder()
      .setTitle('Thanks for adding me!')
      .setColor('#3B82F6')
      .setThumbnail(message.guild.iconURL({ dynamic: true, size: 256 }) || message.client.user.displayAvatarURL({ dynamic: true }))
      .setDescription(
        `${arrowIcon} **Prefix For This Server is** \`${prefix}\`\n` +
        `${arrowIcon} **Get Started with** \`${prefix}help\`\n` +
        `${arrowIcon} For detailed guides, FAQ & information, visit our **[Support Server](${supportUrl})**`
      )
      .setFooter({ text: 'Powered by NexusBot™' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Support')
        .setURL(supportUrl)
        .setStyle(ButtonStyle.Link),
      new ButtonBuilder()
        .setLabel('Website')
        .setURL(webUrl)
        .setStyle(ButtonStyle.Link)
    );

    await message.reply({ embeds: [embed], components: [row] });
    return true;
  }

  if (!message.content.startsWith(prefix)) return false;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();
  if (!command) return false;

  const guild = message.guild;
  const guildId = guild.id;
  const channel = message.channel;
  const author = message.author;
  const member = message.member;

  const successIcon = statusEmoji('success') || getEmoji('nexus_success') || '✅';
  const errorIcon = statusEmoji('error') || getEmoji('nexus_error') || '❌';
  const shieldIcon = statusEmoji('automod') || getEmoji('nexus_automod') || '🛡️';
  const lockIcon = statusEmoji('lock') || getEmoji('nexus_lock') || '🔒';
  const banIcon = statusEmoji('ban') || getEmoji('nexus_ban') || '🔨';
  const userIcon = getEmoji('nexus_member') || '👤';

  // Command 1: extractembed / embedjson
  if (['extractembed', 'extract-embed', 'embedjson'].includes(command)) {
    let targetMessage = null;
    try {
      if (message.reference?.messageId) {
        targetMessage = await channel.messages.fetch(message.reference.messageId).catch(() => null);
      } else if (args[0] && /^\d+$/.test(args[0])) {
        targetMessage = await channel.messages.fetch(args[0]).catch(() => null);
      } else {
        const recent = await channel.messages.fetch({ limit: 10 });
        targetMessage = recent.find(m => m.id !== message.id && m.embeds && m.embeds.length > 0);
      }

      if (!targetMessage) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} No message with embeds found. Reply to an embed message or specify a message ID.`);
        await message.reply({ embeds: [embed] });
        return true;
      }

      if (!targetMessage.embeds || targetMessage.embeds.length === 0) {
        const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} No embeds found in the targeted message (\`${targetMessage.id}\`).`);
        await message.reply({ embeds: [embed] });
        return true;
      }

      const rawEmbeds = targetMessage.embeds.map(e => e.data || (e.toJSON ? e.toJSON() : e));
      const jsonContent = JSON.stringify(rawEmbeds.length === 1 ? rawEmbeds[0] : rawEmbeds, null, 2);

      if (jsonContent.length <= 1900) {
        await message.reply({
          content: `📦 **Extracted Embed JSON** (from message \`${targetMessage.id}\`):\n\`\`\`json\n${jsonContent}\n\`\`\``
        });
      } else {
        const attachment = new AttachmentBuilder(Buffer.from(jsonContent, 'utf-8'), { name: 'embed.json' });
        await message.reply({
          content: `📦 **Extracted Embed JSON** (Exceeds character limit, attached file for message \`${targetMessage.id}\`):`,
          files: [attachment]
        });
      }
      return true;
    } catch (err) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Failed to extract embed: ${err.message}`);
      await message.reply({ embeds: [embed] });
      return true;
    }
  }

  // Command 2: ping
  if (command === 'ping') {
    const embed = new EmbedBuilder()
      .setColor('#3B82F6')
      .setDescription(`🏓 **Pong!**\nLatency: \`${Date.now() - message.createdTimestamp}ms\` | WebSocket Ping: \`${Math.round(message.client.ws.ping)}ms\``);
    await message.reply({ embeds: [embed] });
    return true;
  }

  // Command 3: ban
  if (command === 'ban') {
    if (!member.permissions.has(PermissionFlagsBits.BanMembers)) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`BanMembers\` permission required.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const targetMember = await parseMember(guild, args[0]);
    if (!targetMember) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Please specify a valid member tag or ID to ban.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const reason = args.slice(1).join(' ') || 'No reason specified';
    try {
      await targetMember.ban({ reason });
      addGuildAudit(guildId, 'moderation', 'MEMBER_BANNED', `Banned ${targetMember.user.tag}. Reason: ${reason}`, author.tag);
      const embed = new EmbedBuilder()
        .setTitle(`${banIcon} Member Banned`)
        .setColor('#EF4444')
        .setDescription(`Successfully banned <@${targetMember.id}> from the server.`)
        .addFields(
          { name: 'Target Member', value: `<@${targetMember.id}> (\`${targetMember.id}\`)`, inline: true },
          { name: 'Moderator', value: `<@${author.id}>`, inline: true },
          { name: 'Reason', value: `\`${reason}\``, inline: false }
        )
        .setTimestamp();
      await message.reply({ embeds: [embed] });
    } catch (err) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Failed to ban member: ${err.message}`);
      await message.reply({ embeds: [embed] });
    }
    return true;
  }

  // Command 4: kick
  if (command === 'kick') {
    if (!member.permissions.has(PermissionFlagsBits.KickMembers)) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`KickMembers\` permission required.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const targetMember = await parseMember(guild, args[0]);
    if (!targetMember) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Please specify a valid member tag or ID to kick.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const reason = args.slice(1).join(' ') || 'No reason specified';
    try {
      await targetMember.kick(reason);
      addGuildAudit(guildId, 'moderation', 'MEMBER_KICKED', `Kicked ${targetMember.user.tag}. Reason: ${reason}`, author.tag);
      const embed = new EmbedBuilder()
        .setTitle(`${successIcon} Member Kicked`)
        .setColor('#F59E0B')
        .setDescription(`Successfully kicked <@${targetMember.id}> from the server.`)
        .addFields(
          { name: 'Target Member', value: `<@${targetMember.id}>`, inline: true },
          { name: 'Moderator', value: `<@${author.id}>`, inline: true },
          { name: 'Reason', value: `\`${reason}\``, inline: false }
        )
        .setTimestamp();
      await message.reply({ embeds: [embed] });
    } catch (err) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Failed to kick member: ${err.message}`);
      await message.reply({ embeds: [embed] });
    }
    return true;
  }

  // Command 5: tempban
  if (command === 'tempban') {
    if (!member.permissions.has(PermissionFlagsBits.BanMembers)) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`BanMembers\` permission required.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const targetMember = await parseMember(guild, args[0]);
    const durationMs = parseDuration(args[1]);
    if (!targetMember || !durationMs) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Usage: \`${prefix}tempban <@user> <duration, e.g. 1h/7d> [reason]\``);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const reason = args.slice(2).join(' ') || 'Temporary ban';
    try {
      await targetMember.ban({ reason });
      addGuildAudit(guildId, 'moderation', 'MEMBER_TEMPBANNED', `Temp-banned ${targetMember.user.tag} for ${args[1]}. Reason: ${reason}`, author.tag);
      const embed = new EmbedBuilder()
        .setTitle(`${banIcon} Member Temporarily Banned`)
        .setColor('#EF4444')
        .setDescription(`Banned <@${targetMember.id}> for **${args[1]}**.`)
        .addFields(
          { name: 'Duration', value: `\`${args[1]}\``, inline: true },
          { name: 'Reason', value: `\`${reason}\``, inline: true }
        )
        .setTimestamp();
      await message.reply({ embeds: [embed] });
    } catch (err) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Failed to tempban: ${err.message}`);
      await message.reply({ embeds: [embed] });
    }
    return true;
  }

  // Command 6: softban
  if (command === 'softban') {
    if (!member.permissions.has(PermissionFlagsBits.BanMembers)) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`BanMembers\` permission required.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const targetMember = await parseMember(guild, args[0]);
    if (!targetMember) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Please specify a valid member tag or ID.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const reason = args.slice(1).join(' ') || 'Softban (messages cleared)';
    try {
      await targetMember.ban({ deleteMessageSeconds: 604800, reason });
      await guild.members.unban(targetMember.id, 'Softban lift');
      addGuildAudit(guildId, 'moderation', 'MEMBER_SOFTBANNED', `Softbanned ${targetMember.user.tag}. Reason: ${reason}`, author.tag);
      const embed = new EmbedBuilder()
        .setTitle(`${successIcon} Member Softbanned`)
        .setColor('#F59E0B')
        .setDescription(`Softbanned <@${targetMember.id}> (kicked & 7 days messages purged).`)
        .addFields({ name: 'Reason', value: `\`${reason}\`` });
      await message.reply({ embeds: [embed] });
    } catch (err) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Failed to softban: ${err.message}`);
      await message.reply({ embeds: [embed] });
    }
    return true;
  }

  // Command 7: unban
  if (command === 'unban') {
    if (!member.permissions.has(PermissionFlagsBits.BanMembers)) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`BanMembers\` permission required.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const userId = args[0]?.replace(/[<@!>]/g, '');
    if (!userId) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Please specify a valid user ID to unban.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const reason = args.slice(1).join(' ') || 'Unbanned by moderator';
    try {
      await guild.members.unban(userId, reason);
      addGuildAudit(guildId, 'moderation', 'MEMBER_UNBANNED', `Unbanned user ID ${userId}. Reason: ${reason}`, author.tag);
      const embed = new EmbedBuilder()
        .setTitle(`${successIcon} Member Unbanned`)
        .setColor('#10B981')
        .setDescription(`Successfully revoked ban for user ID \`${userId}\`.`)
        .addFields({ name: 'Reason', value: `\`${reason}\`` });
      await message.reply({ embeds: [embed] });
    } catch (err) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Failed to unban user: ${err.message}`);
      await message.reply({ embeds: [embed] });
    }
    return true;
  }

  // Command 8: timeout / mute
  if (['timeout', 'mute'].includes(command)) {
    if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`ModerateMembers\` permission required.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const targetMember = await parseMember(guild, args[0]);
    const durationMs = parseDuration(args[1]);
    if (!targetMember || !durationMs) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Usage: \`${prefix}${command} <@user> <duration, e.g. 10m/1h> [reason]\``);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const reason = args.slice(2).join(' ') || 'Muted by moderator';
    try {
      await targetMember.timeout(durationMs, reason);
      addGuildAudit(guildId, 'moderation', 'MEMBER_TIMEOUT', `Timed out ${targetMember.user.tag} for ${args[1]}. Reason: ${reason}`, author.tag);
      const embed = new EmbedBuilder()
        .setTitle(`${shieldIcon} Member Muted / Timed Out`)
        .setColor('#F59E0B')
        .setDescription(`Placed <@${targetMember.id}> on timeout for **${args[1]}**.`)
        .addFields(
          { name: 'Duration', value: `\`${args[1]}\``, inline: true },
          { name: 'Reason', value: `\`${reason}\``, inline: true }
        );
      await message.reply({ embeds: [embed] });
    } catch (err) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Failed to timeout member: ${err.message}`);
      await message.reply({ embeds: [embed] });
    }
    return true;
  }

  // Command 9: untimeout / unmute
  if (['untimeout', 'unmute'].includes(command)) {
    if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`ModerateMembers\` permission required.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const targetMember = await parseMember(guild, args[0]);
    if (!targetMember) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Please specify a valid member.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const reason = args.slice(1).join(' ') || 'Timeout lifted';
    try {
      await targetMember.timeout(null, reason);
      addGuildAudit(guildId, 'moderation', 'MEMBER_UNTIMEOUT', `Removed timeout for ${targetMember.user.tag}`, author.tag);
      const embed = new EmbedBuilder()
        .setTitle(`${successIcon} Timeout Lifted`)
        .setColor('#10B981')
        .setDescription(`Removed timeout from <@${targetMember.id}>.`)
        .addFields({ name: 'Reason', value: `\`${reason}\`` });
      await message.reply({ embeds: [embed] });
    } catch (err) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Failed to lift timeout: ${err.message}`);
      await message.reply({ embeds: [embed] });
    }
    return true;
  }

  // Command 10: warn
  if (command === 'warn') {
    if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`ManageMessages\` permission required.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const targetMember = await parseMember(guild, args[0]);
    if (!targetMember) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Please specify a member to warn.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const reason = args.slice(1).join(' ') || 'Warned by moderator';
    try {
      const warnResult = await issueWarning({
        guild,
        targetUser: targetMember.user,
        reason,
        source: 'manual',
        executorId: author.id,
        executorTag: author.tag
      });

      addGuildAudit(guildId, 'moderation', 'MEMBER_WARNED', `Warned ${targetMember.user.tag}. Reason: ${reason}`, author.tag);
      const embed = new EmbedBuilder()
        .setTitle(`${shieldIcon} Warning Issued`)
        .setColor('#F59E0B')
        .setDescription(`Issued official warning to <@${targetMember.id}>. Total Warnings: **${warnResult.activeCount}**`)
        .addFields({ name: 'Reason', value: `\`${reason}\`` });
      await message.reply({ embeds: [embed] });
    } catch (err) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Failed to issue warning: ${err.message}`);
      await message.reply({ embeds: [embed] });
    }
    return true;
  }

  // Command 11: warnings / warns
  if (['warnings', 'warns'].includes(command)) {
    const targetMember = (await parseMember(guild, args[0])) || member;
    const warningsPath = path.join(DATA_DIR, guildId, 'warnings.json');
    let warnings = [];
    try { warnings = JSON.parse(fs.readFileSync(warningsPath, 'utf8')); } catch (e) {}

    const userWarns = warnings.filter(w => w.memberId === targetMember.id && w.active !== false);

    const embed = new EmbedBuilder()
      .setTitle(`${shieldIcon} Warning History: ${targetMember.user.tag}`)
      .setColor('#3B82F6')
      .setDescription(`Active Warning Count: **${userWarns.length}**`)
      .setTimestamp();

    if (userWarns.length > 0) {
      userWarns.slice(0, 10).forEach((w, idx) => {
        embed.addFields({
          name: `#${idx + 1} - Warn ID: ${w.id}`,
          value: `**Reason**: ${w.reason}\n**By**: ${w.executorTag}\n**Date**: <t:${Math.floor(new Date(w.timestamp).getTime() / 1000)}:R>`
        });
      });
    } else {
      embed.addFields({ name: 'Status', value: '✅ Clean record! No active warnings.' });
    }
    await message.reply({ embeds: [embed] });
    return true;
  }

  // Command 12: modlogs
  if (command === 'modlogs') {
    const auditPath = path.join(DATA_DIR, guildId, 'audit.json');
    let auditLogs = [];
    try { auditLogs = JSON.parse(fs.readFileSync(auditPath, 'utf8')); } catch (e) {}

    const embed = new EmbedBuilder()
      .setTitle(`${shieldIcon} Recent Moderation Audit Logs`)
      .setColor('#3B82F6')
      .setTimestamp();

    if (auditLogs.length > 0) {
      const recent = auditLogs.slice(-10).reverse();
      recent.forEach(log => {
        embed.addFields({
          name: `${log.action || 'ACTION'} • <t:${Math.floor(new Date(log.timestamp).getTime() / 1000)}:R>`,
          value: `**Details**: ${log.details}\n**Executor**: \`${log.executor}\``
        });
      });
    } else {
      embed.setDescription('No recorded audit events found.');
    }
    await message.reply({ embeds: [embed] });
    return true;
  }

  // Command 13: lock
  if (command === 'lock') {
    if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`ManageChannels\` permission required.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const reason = args.join(' ') || 'Channel lockdown';
    try {
      await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false }, { reason });
      addGuildAudit(guildId, 'moderation', 'CHANNEL_LOCK', `Locked channel #${channel.name}`, author.tag);
      const embed = new EmbedBuilder()
        .setTitle(`${lockIcon} Channel Locked Down`)
        .setColor('#EF4444')
        .setDescription(`Channel <#${channel.id}> has been locked for \`@everyone\`.`)
        .addFields({ name: 'Reason', value: `\`${reason}\`` });
      await message.reply({ embeds: [embed] });
    } catch (err) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Lock failed: ${err.message}`);
      await message.reply({ embeds: [embed] });
    }
    return true;
  }

  // Command 14: unlock
  if (command === 'unlock') {
    if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`ManageChannels\` permission required.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const reason = args.join(' ') || 'Lockdown lifted';
    try {
      await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null }, { reason });
      addGuildAudit(guildId, 'moderation', 'CHANNEL_UNLOCK', `Unlocked channel #${channel.name}`, author.tag);
      const embed = new EmbedBuilder()
        .setTitle(`${successIcon} Channel Unlocked`)
        .setColor('#10B981')
        .setDescription(`Channel <#${channel.id}> messaging privileges restored for \`@everyone\`.`)
        .addFields({ name: 'Reason', value: `\`${reason}\`` });
      await message.reply({ embeds: [embed] });
    } catch (err) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Unlock failed: ${err.message}`);
      await message.reply({ embeds: [embed] });
    }
    return true;
  }

  // Command 15: lockall
  if (command === 'lockall') {
    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`Administrator\` permission required.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const reason = args.join(' ') || 'Server emergency lockdown';
    try {
      const textChannels = guild.channels.cache.filter(c => c.isTextBased() && c.type === 0);
      let count = 0;
      for (const [_, ch] of textChannels) {
        await ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false }, { reason }).catch(() => {});
        count++;
      }
      addGuildAudit(guildId, 'moderation', 'SERVER_LOCKALL', `Locked all ${count} text channels`, author.tag);
      const embed = new EmbedBuilder()
        .setTitle(`${lockIcon} Server Emergency Lockdown`)
        .setColor('#EF4444')
        .setDescription(`Locked down **${count}** text channels for \`@everyone\`.`)
        .addFields({ name: 'Reason', value: `\`${reason}\`` });
      await message.reply({ embeds: [embed] });
    } catch (err) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Lockall failed: ${err.message}`);
      await message.reply({ embeds: [embed] });
    }
    return true;
  }

  // Command 16: unlockall
  if (command === 'unlockall') {
    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`Administrator\` permission required.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const reason = args.join(' ') || 'Server lockdown lifted';
    try {
      const textChannels = guild.channels.cache.filter(c => c.isTextBased() && c.type === 0);
      let count = 0;
      for (const [_, ch] of textChannels) {
        await ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null }, { reason }).catch(() => {});
        count++;
      }
      addGuildAudit(guildId, 'moderation', 'SERVER_UNLOCKALL', `Unlocked all ${count} text channels`, author.tag);
      const embed = new EmbedBuilder()
        .setTitle(`${successIcon} Server Lockdown Lifted`)
        .setColor('#10B981')
        .setDescription(`Restored messaging in **${count}** text channels for \`@everyone\`.`)
        .addFields({ name: 'Reason', value: `\`${reason}\`` });
      await message.reply({ embeds: [embed] });
    } catch (err) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Unlockall failed: ${err.message}`);
      await message.reply({ embeds: [embed] });
    }
    return true;
  }

  // Command 17: purge / clear
  if (['purge', 'clear'].includes(command)) {
    if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`ManageMessages\` permission required.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const amount = parseInt(args[0], 10);
    if (!amount || amount < 1 || amount > 100) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Please specify an amount between 1 and 100.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    try {
      await message.delete().catch(() => {});
      const deleted = await channel.bulkDelete(amount, true);
      addGuildAudit(guildId, 'moderation', 'MESSAGES_PURGED', `Purged ${deleted.size} messages in #${channel.name}`, author.tag);
      const embed = new EmbedBuilder()
        .setTitle(`${successIcon} Messages Purged`)
        .setColor('#10B981')
        .setDescription(`Successfully purged **${deleted.size}** messages from <#${channel.id}>.`);
      const confirmMsg = await channel.send({ embeds: [embed] });
      setTimeout(() => confirmMsg.delete().catch(() => {}), 4000);
    } catch (err) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Purge failed: ${err.message}`);
      await channel.send({ embeds: [embed] });
    }
    return true;
  }

  // Command 18: slowmode
  if (command === 'slowmode') {
    if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`ManageChannels\` permission required.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const seconds = parseInt(args[0], 10);
    if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Please specify seconds between 0 and 21600 (6 hours).`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    try {
      await channel.setRateLimitPerUser(seconds);
      addGuildAudit(guildId, 'moderation', 'SLOWMODE_SET', `Set slowmode to ${seconds}s in #${channel.name}`, author.tag);
      const embed = new EmbedBuilder()
        .setTitle(`${successIcon} Slowmode Configured`)
        .setColor('#3B82F6')
        .setDescription(`Set channel slowmode to **${seconds}** seconds.`);
      await message.reply({ embeds: [embed] });
    } catch (err) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Slowmode failed: ${err.message}`);
      await message.reply({ embeds: [embed] });
    }
    return true;
  }

  // Command 19: nick
  if (command === 'nick') {
    if (!member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`ManageNicknames\` permission required.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const targetMember = await parseMember(guild, args[0]);
    if (!targetMember) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Usage: \`${prefix}nick <@user> [new_nickname]\``);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const nickname = args.slice(1).join(' ') || null;
    try {
      const oldNick = targetMember.nickname || targetMember.user.username;
      await targetMember.setNickname(nickname);
      addGuildAudit(guildId, 'moderation', 'NICKNAME_CHANGE', `Changed ${targetMember.user.tag} nick from "${oldNick}" to "${nickname || '[RESET]'}"`, author.tag);
      const embed = new EmbedBuilder()
        .setTitle(`${successIcon} Nickname Updated`)
        .setColor('#3B82F6')
        .setDescription(`Updated nickname for <@${targetMember.id}> to \`${nickname || '[Reset]'}\`.`);
      await message.reply({ embeds: [embed] });
    } catch (err) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Failed to change nickname: ${err.message}`);
      await message.reply({ embeds: [embed] });
    }
    return true;
  }

  // Command 20: role
  if (command === 'role') {
    if (!member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`ManageRoles\` permission required.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const subAction = args[0]?.toLowerCase();
    const targetMember = await parseMember(guild, args[1]);
    const targetRole = parseRole(guild, args[2]);

    if (!['add', 'remove'].includes(subAction) || !targetMember || !targetRole) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Usage: \`${prefix}role <add|remove> <@user> <@role> [reason]\``);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const reason = args.slice(3).join(' ') || 'Role updated via prefix command';
    try {
      if (subAction === 'add') {
        await targetMember.roles.add(targetRole, reason);
        addGuildAudit(guildId, 'moderation', 'ROLE_ASSIGNED', `Assigned role ${targetRole.name} to ${targetMember.user.tag}`, author.tag);
        const embed = new EmbedBuilder()
          .setTitle(`${successIcon} Role Assigned`)
          .setColor('#10B981')
          .setDescription(`Granted role <@&${targetRole.id}> to <@${targetMember.id}>.`);
        await message.reply({ embeds: [embed] });
      } else {
        await targetMember.roles.remove(targetRole, reason);
        addGuildAudit(guildId, 'moderation', 'ROLE_REMOVED', `Removed role ${targetRole.name} from ${targetMember.user.tag}`, author.tag);
        const embed = new EmbedBuilder()
          .setTitle(`${successIcon} Role Removed`)
          .setColor('#F59E0B')
          .setDescription(`Revoked role <@&${targetRole.id}> from <@${targetMember.id}>.`);
        await message.reply({ embeds: [embed] });
      }
    } catch (err) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Role update failed: ${err.message}`);
      await message.reply({ embeds: [embed] });
    }
    return true;
  }

  // Command 21: userinfo
  if (['userinfo', 'user', 'whois'].includes(command)) {
    const targetMember = (await parseMember(guild, args[0])) || member;
    const targetUser = targetMember.user;

    const warningsPath = path.join(DATA_DIR, guildId, 'warnings.json');
    let warnings = [];
    try { warnings = JSON.parse(fs.readFileSync(warningsPath, 'utf8')); } catch (e) {}
    const userWarns = warnings.filter(w => w.memberId === targetUser.id && w.active !== false);

    const joinedAtStr = targetMember.joinedAt ? `<t:${Math.floor(targetMember.joinedAt.getTime() / 1000)}:R>` : 'Unknown';
    const createdAtStr = `<t:${Math.floor(targetUser.createdAt.getTime() / 1000)}:R>`;
    const isTimedOut = targetMember.isCommunicationDisabled?.();

    const rolesList = targetMember.roles.cache
      .filter(r => r.name !== '@everyone')
      .map(r => `<@&${r.id}>`)
      .slice(0, 10)
      .join(', ') || 'None';

    const embed = new EmbedBuilder()
      .setTitle(`${userIcon} Member Security Profile: ${targetUser.tag}`)
      .setColor('#5865F2')
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: 'User Identifier', value: `<@${targetUser.id}>\n\`${targetUser.id}\``, inline: true },
        { name: 'Bot Account', value: targetUser.bot ? '🤖 Yes' : '👤 No', inline: true },
        { name: 'Account Created', value: createdAtStr, inline: true },
        { name: 'Joined Server', value: joinedAtStr, inline: true },
        { name: 'Active Warnings', value: `\`${userWarns.length}\``, inline: true },
        { name: 'Timeout Status', value: isTimedOut ? '⏳ Active Timeout' : '✅ Clean', inline: true },
        { name: 'Roles', value: rolesList, inline: false }
      )
      .setTimestamp();
    await message.reply({ embeds: [embed] });
    return true;
  }

  // Command 22: serverinfo
  if (['serverinfo', 'server'].includes(command)) {
    const { embeds, components } = await getServerInfoEmbedAndComponents(guild, 'general', author);
    await message.reply({ embeds, components });
    return true;
  }

  // Command 23: massrole
  if (command === 'massrole') {
    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`Administrator\` permission required.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const action = args[0]?.toLowerCase();
    const targetGroup = args[1]?.toLowerCase();
    const role = parseRole(guild, args[2]);

    if (!['add', 'remove'].includes(action) || !['humans', 'bots', 'all'].includes(targetGroup) || !role) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Usage: \`${prefix}massrole <add|remove> <humans|bots|all> <@role> [reason]\``);
      await message.reply({ embeds: [embed] });
      return true;
    }

    const reason = args.slice(3).join(' ') || 'Mass role execution';
    const statusMsg = await message.reply({ embeds: [new EmbedBuilder().setColor('#3B82F6').setDescription(`⏳ Processing mass role action... Please wait.`)] });

    try {
      const members = await guild.members.fetch();
      let affectedCount = 0;

      for (const [_, m] of members) {
        if (targetGroup === 'humans' && m.user.bot) continue;
        if (targetGroup === 'bots' && !m.user.bot) continue;

        if (action === 'add' && !m.roles.cache.has(role.id)) {
          await m.roles.add(role, reason).catch(() => {});
          affectedCount++;
        } else if (action === 'remove' && m.roles.cache.has(role.id)) {
          await m.roles.remove(role, reason).catch(() => {});
          affectedCount++;
        }
      }

      addGuildAudit(guildId, 'moderation', 'MASS_ROLE_EXECUTED', `Mass ${action} role ${role.name} to ${affectedCount} members`, author.tag);
      const embed = new EmbedBuilder()
        .setTitle(`${successIcon} Mass Role Execution Complete`)
        .setColor('#10B981')
        .setDescription(`Successfully ${action === 'add' ? 'assigned' : 'removed'} role <@&${role.id}> for **${affectedCount}** members.`);
      await statusMsg.edit({ embeds: [embed] });
    } catch (err) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Mass role failed: ${err.message}`);
      await statusMsg.edit({ embeds: [embed] });
    }
    return true;
  }

  // Command 24: voicemute
  if (command === 'voicemute') {
    if (!member.permissions.has(PermissionFlagsBits.MuteMembers)) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`MuteMembers\` permission required.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const targetMember = await parseMember(guild, args[0]);
    if (!targetMember || !targetMember.voice?.channel) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Target user is not connected to a voice channel.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const reason = args.slice(1).join(' ') || 'Voice mute';
    try {
      await targetMember.voice.setMute(true, reason);
      addGuildAudit(guildId, 'moderation', 'VOICE_MUTE', `Voice muted ${targetMember.user.tag}`, author.tag);
      const embed = new EmbedBuilder().setTitle(`${successIcon} Voice Muted`).setColor('#F59E0B').setDescription(`Server muted <@${targetMember.id}> in voice.`);
      await message.reply({ embeds: [embed] });
    } catch (err) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Voice mute failed: ${err.message}`);
      await message.reply({ embeds: [embed] });
    }
    return true;
  }

  // Command 25: voiceunmute
  if (command === 'voiceunmute') {
    if (!member.permissions.has(PermissionFlagsBits.MuteMembers)) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`MuteMembers\` permission required.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const targetMember = await parseMember(guild, args[0]);
    if (!targetMember || !targetMember.voice?.channel) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Target user is not connected to a voice channel.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const reason = args.slice(1).join(' ') || 'Voice unmute';
    try {
      await targetMember.voice.setMute(false, reason);
      addGuildAudit(guildId, 'moderation', 'VOICE_UNMUTE', `Voice unmuted ${targetMember.user.tag}`, author.tag);
      const embed = new EmbedBuilder().setTitle(`${successIcon} Voice Unmuted`).setColor('#10B981').setDescription(`Server unmuted <@${targetMember.id}> in voice.`);
      await message.reply({ embeds: [embed] });
    } catch (err) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Voice unmute failed: ${err.message}`);
      await message.reply({ embeds: [embed] });
    }
    return true;
  }

  // Command 26: voicekick
  if (command === 'voicekick') {
    if (!member.permissions.has(PermissionFlagsBits.MoveMembers)) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`MoveMembers\` permission required.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const targetMember = await parseMember(guild, args[0]);
    if (!targetMember || !targetMember.voice?.channel) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Target user is not connected to a voice channel.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const reason = args.slice(1).join(' ') || 'Voice kick';
    try {
      await targetMember.voice.disconnect(reason);
      addGuildAudit(guildId, 'moderation', 'VOICE_KICK', `Disconnected ${targetMember.user.tag} from voice`, author.tag);
      const embed = new EmbedBuilder().setTitle(`${successIcon} Voice Kicked`).setColor('#F59E0B').setDescription(`Disconnected <@${targetMember.id}> from voice channel.`);
      await message.reply({ embeds: [embed] });
    } catch (err) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Voice kick failed: ${err.message}`);
      await message.reply({ embeds: [embed] });
    }
    return true;
  }

  // Command 27: deafen
  if (command === 'deafen') {
    if (!member.permissions.has(PermissionFlagsBits.DeafenMembers)) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`DeafenMembers\` permission required.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const targetMember = await parseMember(guild, args[0]);
    if (!targetMember || !targetMember.voice?.channel) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Target user is not connected to a voice channel.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const reason = args.slice(1).join(' ') || 'Voice deafen';
    try {
      await targetMember.voice.setDeaf(true, reason);
      addGuildAudit(guildId, 'moderation', 'VOICE_DEAFEN', `Deafened ${targetMember.user.tag}`, author.tag);
      const embed = new EmbedBuilder().setTitle(`${successIcon} Member Deafened`).setColor('#F59E0B').setDescription(`Deafened <@${targetMember.id}> in voice.`);
      await message.reply({ embeds: [embed] });
    } catch (err) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Deafen failed: ${err.message}`);
      await message.reply({ embeds: [embed] });
    }
    return true;
  }

  // Command 28: undeafen
  if (command === 'undeafen') {
    if (!member.permissions.has(PermissionFlagsBits.DeafenMembers)) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`DeafenMembers\` permission required.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const targetMember = await parseMember(guild, args[0]);
    if (!targetMember || !targetMember.voice?.channel) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Target user is not connected to a voice channel.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const reason = args.slice(1).join(' ') || 'Voice undeafen';
    try {
      await targetMember.voice.setDeaf(false, reason);
      addGuildAudit(guildId, 'moderation', 'VOICE_UNDEAFEN', `Undeafened ${targetMember.user.tag}`, author.tag);
      const embed = new EmbedBuilder().setTitle(`${successIcon} Deafen Lifted`).setColor('#10B981').setDescription(`Undeafened <@${targetMember.id}> in voice.`);
      await message.reply({ embeds: [embed] });
    } catch (err) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Undeafen failed: ${err.message}`);
      await message.reply({ embeds: [embed] });
    }
    return true;
  }

  // Command 29: strip
  if (command === 'strip') {
    if (!member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`ManageRoles\` permission required.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const targetMember = await parseMember(guild, args[0]);
    if (!targetMember) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Please specify a member tag or ID.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const reason = args.slice(1).join(' ') || 'Roles stripped by moderator';
    try {
      const assignableRoles = targetMember.roles.cache.filter(r => r.name !== '@everyone' && r.position < guild.members.me.roles.highest.position);
      await targetMember.roles.remove(assignableRoles, reason);
      addGuildAudit(guildId, 'moderation', 'ROLES_STRIPPED', `Stripped ${assignableRoles.size} roles from ${targetMember.user.tag}`, author.tag);
      const embed = new EmbedBuilder().setTitle(`${successIcon} Roles Stripped`).setColor('#F59E0B').setDescription(`Stripped **${assignableRoles.size}** roles from <@${targetMember.id}>.`);
      await message.reply({ embeds: [embed] });
    } catch (err) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Strip roles failed: ${err.message}`);
      await message.reply({ embeds: [embed] });
    }
    return true;
  }

  // Command 30: quarantine
  if (command === 'quarantine') {
    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} **Access Denied**: \`Administrator\` permission required.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const targetMember = await parseMember(guild, args[0]);
    if (!targetMember) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Please specify a member tag or ID.`);
      await message.reply({ embeds: [embed] });
      return true;
    }
    const reason = args.slice(1).join(' ') || 'Quarantined for severe policy violation';
    try {
      const assignableRoles = targetMember.roles.cache.filter(r => r.name !== '@everyone' && r.position < guild.members.me.roles.highest.position);
      await targetMember.roles.remove(assignableRoles, `[Quarantine] ${reason}`);
      await targetMember.timeout(28 * 24 * 60 * 60 * 1000, `[Quarantine] ${reason}`);
      addGuildAudit(guildId, 'moderation', 'MEMBER_QUARANTINED', `Quarantined ${targetMember.user.tag}. Reason: ${reason}`, author.tag);
      const embed = new EmbedBuilder()
        .setTitle(`${shieldIcon} Member Quarantined`)
        .setColor('#EF4444')
        .setDescription(`Member <@${targetMember.id}> has been stripped of roles and isolated for 28 days.`)
        .addFields({ name: 'Reason', value: `\`${reason}\`` });
      await message.reply({ embeds: [embed] });
    } catch (err) {
      const embed = new EmbedBuilder().setColor('#EF4444').setDescription(`${errorIcon} Quarantine failed: ${err.message}`);
      await message.reply({ embeds: [embed] });
    }
    return true;
  }

  // Command 31: help
  if (['help', 'cmds', 'commands'].includes(command)) {
    const query = args[0] || null;
    const context = {
      client: message.client,
      guild,
      user: author,
      prefix,
      commandQuery: query
    };
    const { embeds, components } = getHelpEmbedAndComponents('home', context);
    const sentMsg = await message.reply({ embeds, components });
    setHelpTimeout(sentMsg, 'home', context);
    return true;
  }

  return false;
}

export default async function handleMessage(message) {
  if (!message.guildId || message.author.bot) return;

  const guildId = message.guildId;
  const settings = getGuildSettings(guildId);

  // 1. Process Prefix Commands first
  const handled = await handlePrefixCommand(message, settings);
  if (handled) return;

  // 2. Check if AutoMod is enabled
  if (!settings?.automod?.enabled) return;

  const member = message.member;
  const content = message.content;

  // Permissions check - bypass mod team unless extreme enforceStaff is active
  const isOwner = message.author.id === message.guild.ownerId;
  const isStaff = member?.permissions?.has(PermissionFlagsBits.ManageMessages);
  
  // Whitelist bypass check
  const isWhitelistedUser = settings.whitelist?.users?.includes(message.author.id);
  const isWhitelistedRole = member?.roles?.cache?.some(r => settings.whitelist?.roles?.includes(r.id));
  if (isWhitelistedUser || isWhitelistedRole) {
    return; // Completely bypass whitelisted users and roles
  }

  if (isStaff && !isOwner) {
    if (!settings.automod.enforceStaff) {
      return; // Bypass staff
    }
  } else if (isOwner) {
    return; // Always bypass owner
  }

  let triggerAutoMod = false;
  let reason = '';

  // 1. Spam Filter (Sliding Window)
  if (settings.automod.spamFilter) {
    const now = Date.now();
    const userKey = `${guildId}-${message.author.id}`;
    let timestamps = messageTimestamps.get(userKey) || [];
    timestamps.push(now);

    const timeWindowSeconds = parseInt(settings.automod.spamTimeWindow, 10) || 10;
    const windowMs = timeWindowSeconds * 1000;
    timestamps = timestamps.filter(t => now - t < windowMs);
    messageTimestamps.set(userKey, timestamps);

    const limit = parseInt(settings.automod.spamMsgLimit || settings.automod.mentionLimit, 10) || 5;
    if (limit > 0 && timestamps.length > limit) {
      triggerAutoMod = true;
      reason = `Rapid Chat Spamming (>${limit} msgs / ${timeWindowSeconds}s)`;
    }
  }

  // 2. Duplicate / Repeated Message Spam Protection
  if (!triggerAutoMod && settings.automod.duplicateFilter) {
    const userKey = `${guildId}-${message.author.id}`;
    const lastMsg = lastUserMessage.get(userKey);
    const now = Date.now();
    if (lastMsg && lastMsg.content === content && now - lastMsg.timestamp < 15000) {
      triggerAutoMod = true;
      reason = 'Duplicate text spamming detected';
    } else {
      lastUserMessage.set(userKey, { content, timestamp: now });
    }
  }

  // 3. Link Filter
  if (!triggerAutoMod && settings.automod.linkFilter) {
    const hasUrl = /(https?:\/\/[^\s]+)/g.test(content);
    if (hasUrl) {
      triggerAutoMod = true;
      reason = 'Unauthorized Link Sharing';
    }
  }

  // 4. Invite Filter
  if (!triggerAutoMod && settings.automod.inviteFilter) {
    const hasInvite = /(discord\.gg|discord\.com\/invite)\/[^\s]+/g.test(content);
    if (hasInvite) {
      triggerAutoMod = true;
      reason = 'Unauthorized Server Invite Link';
    }
  }

  // 5. Malicious Link / Phishing Scam Filter
  if (!triggerAutoMod && settings.automod.maliciousLinkFilter) {
    const isPhishing = /(steamcomm[^\s]+|discorcl[^\s]+|nitro-gift[^\s]+|free-nitro|claim-reward|giftcard-discord|op-nitro)/gi.test(content);
    if (isPhishing) {
      triggerAutoMod = true;
      reason = 'Malicious Scam/Phishing attempt detected';
    }
  }

  // 6. Emoji Spam Filter
  if (!triggerAutoMod && settings.automod.emojiLimit > 0) {
    const customEmojiRegex = /<a?:[a-zA-Z0-9_]+:\d+>/g;
    const unicodeEmojiRegex = /[\u2600-\u27BF]|[\uD83C-\uDBFF][\uDC00-\uDFFF]/g;
    const customCount = (content.match(customEmojiRegex) || []).length;
    const unicodeCount = (content.match(unicodeEmojiRegex) || []).length;
    const totalEmojis = customCount + unicodeCount;

    if (totalEmojis > settings.automod.emojiLimit) {
      triggerAutoMod = true;
      reason = `Excessive emoji spamming (${totalEmojis} emojis, limit: ${settings.automod.emojiLimit})`;
    }
  }

  // 7. Regex Pattern Checking
  if (!triggerAutoMod && settings.automod.regexPatterns?.length > 0) {
    for (const pattern of settings.automod.regexPatterns) {
      try {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(content)) {
          triggerAutoMod = true;
          reason = `Violated custom pattern rule: "${pattern}"`;
          break;
        }
      } catch (e) {
        console.error('Invalid custom regex defined:', pattern);
      }
    }
  }

  // 8. Bad Words Filter
  if (!triggerAutoMod && settings.automod.badWords?.length > 0) {
    const lower = content.toLowerCase();
    const matched = settings.automod.badWords.find(word => lower.includes(word.toLowerCase()));
    if (matched) {
      triggerAutoMod = true;
      reason = `Banned keyword usage: "${matched}"`;
    }
  }

  // 9. Caps Filter
  if (!triggerAutoMod && settings.automod.capsFilter) {
    const uppercaseLetters = content.replace(/[^A-Z]/g, "").length;
    const totalLetters = content.replace(/[^a-zA-Z]/g, "").length;
    if (totalLetters > 8 && (uppercaseLetters / totalLetters) > 0.7) {
      triggerAutoMod = true;
      reason = 'Excessive uppercase / CAPSLOCK usage';
    }
  }

  // 10. Mass Mentions Filter
  const massLimit = parseInt(settings.automod.massMentionLimit || settings.automod.mentionLimit || 0, 10);
  if (!triggerAutoMod && massLimit > 0) {
    const mentionCount = message.mentions.users.size + message.mentions.roles.size;
    if (mentionCount > massLimit) {
      triggerAutoMod = true;
      reason = `Excessive mentions (${mentionCount} mentions, limit: ${massLimit})`;
    }
  }

  if (triggerAutoMod) {
    try {
      await message.delete();
    } catch (e) {
      console.error('Failed to delete moderated message', e);
    }

    const action = settings.automod.action || 'delete';

    // Log the AutoMod policy violation in the configured logging channel
    logAutoModViolation(message.guild, message.author, message.channel, reason, action, content);

    // Add warning automatically using issueWarning
    const warnResult = await issueWarning({
      guild: message.guild,
      targetUser: message.author,
      reason: `[AutoMod] ${reason}`,
      source: 'automod',
      executorId: 'system-automod',
      executorTag: 'Nexus Bot AutoMod'
    });

    if (warnResult.punishmentTriggered && warnResult.punishmentMessage) {
      try {
        const shieldEmoji = statusEmoji('automod') || getEmoji('nexus_automod');
        await message.channel.send(`${shieldEmoji} <@${message.author.id}> ${warnResult.punishmentMessage}`);
      } catch (e) {}
    }

    addGuildAudit(guildId, 'automod', 'MSG_DELETED', `Deleted message from ${message.author.tag}. Reason: ${reason}`, 'NexusBot AutoMod');

    // Perform configured penalty action on violator (if not the guild owner)
    if (member && !isOwner) {
      if (action === 'timeout') {
        try {
          await member.timeout(1000 * 60 * 60, `AutoMod Violation: ${reason}`); // 1 hour timeout
          addGuildAudit(guildId, 'automod', 'MEMBER_TIMEOUT', `Muted ${message.author.tag} for 1 hour due to: ${reason}`, 'NexusBot AutoMod');
        } catch (err) {
          console.error('AutoMod timeout failed:', err.message);
        }
      } else if (action === 'kick') {
        try {
          await member.kick(`AutoMod Violation: ${reason}`);
          addGuildAudit(guildId, 'automod', 'MEMBER_KICK', `Kicked ${message.author.tag} due to: ${reason}`, 'NexusBot AutoMod');
        } catch (err) {
          console.error('AutoMod kick failed:', err.message);
        }
      } else if (action === 'ban') {
        try {
          await member.ban({ reason: `AutoMod Violation: ${reason}` });
          addGuildAudit(guildId, 'automod', 'MEMBER_BAN', `Banned ${message.author.tag} due to: ${reason}`, 'NexusBot AutoMod');
        } catch (err) {
          console.error('AutoMod ban failed:', err.message);
        }
      }
    }

    // Alert in channel (with rate limiting to avoid spamming the channel with alert messages)
    const alertKey = `${guildId}-${message.author.id}-${message.channelId}`;
    const lastAlert = lastAlertTimestamps.get(alertKey) || 0;
    const nowAlert = Date.now();
    
    if (nowAlert - lastAlert > 4000) {
      lastAlertTimestamps.set(alertKey, nowAlert);
      try {
        const shieldIcon = statusEmoji('automod') || getEmoji('nexus_automod');
        const warnIcon = statusEmoji('warning') || getEmoji('nexus_warn');
        const actionLabel = action === 'delete' ? 'DELETED' : `${action.toUpperCase()}`;
        
        const embed = {
          title: `${shieldIcon} Security AutoMod Enforcement`,
          description: `<@${message.author.id}>, your message in <#${message.channelId}> was removed.`,
          color: 0xED4245, // Professional Discord red
          fields: [
            { name: `Violation Rule`, value: `\`${reason}\``, inline: true },
            { name: 'Penalty Applied', value: `\`${actionLabel}\``, inline: true }
          ],
          thumbnail: {
            url: message.author.displayAvatarURL({ dynamic: true })
          },
          footer: {
            text: 'Nexus Bot • Auto-deleting in 5s',
            icon_url: message.guild.iconURL() || undefined
          },
          timestamp: new Date().toISOString()
        };

        const warningAlert = await message.channel.send({ content: `<@${message.author.id}>`, embeds: [embed] });
        setTimeout(() => warningAlert.delete().catch(() => {}), 5000);
      } catch (e) {
        console.error('Failed to send AutoMod warning alert embed:', e);
      }
    }
  }
}
