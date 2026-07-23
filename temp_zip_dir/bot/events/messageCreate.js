/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PermissionFlagsBits } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { getGuildSettings, addGuildAudit, DATA_DIR } from '../storage.js';
import { getEmoji } from '../utils/emojis.js';
import { statusEmoji } from '../utils/statusEmojis.js';
import { logAutoModViolation, logWarnLimitReached } from '../utils/logger.js';
import { issueWarning } from '../utils/warnings.js';

// In-memory message tracker for Anti-Spam
const messageTimestamps = new Map();
const lastUserMessage = new Map(); // tracks last message content for duplicate spam check
const lastAlertTimestamps = new Map();

export default async function handleMessage(message) {
  if (!message.guildId || message.author.bot) return;

  const guildId = message.guildId;
  const settings = getGuildSettings(guildId);
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
