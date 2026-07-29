/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuditLogEvent } from 'discord.js';
import { getGuildSettings, addGuildAudit } from '../storage.js';

// In-memory channel deletion counters for Anti-Nuke
const deletionTrackers = new Map(); // guildId -> array of { timestamp, executorId }

export default async function handleChannelDelete(channel) {
  if (!channel.guildId) return;
  const guildId = channel.guildId;
  const settings = getGuildSettings(guildId);
  if (!settings?.antinuke?.enabled) return;

  const now = Date.now();
  let deletions = deletionTrackers.get(guildId) || [];
  deletions.push({ timestamp: now });
  deletions = deletions.filter(item => now - item.timestamp < 60000); // 1 minute sliding window
  deletionTrackers.set(guildId, deletions);

  const threshold = settings.antinuke.channelDeleteThreshold || 3;

  if (deletions.length > threshold) {
    let executor = null;
    try {
      // Fetch audit logs to find the culprit who deleted the channel
      const auditLogs = await channel.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.ChannelDelete
      });
      const entry = auditLogs.entries.first();
      if (entry && (now - entry.createdTimestamp < 10000)) { // within last 10 seconds
        executor = entry.executor;
      }
    } catch (e) {
      console.error('AntiNuke: No permission to fetch audit logs or failed:', e.message);
    }

    const executorTag = executor ? executor.tag : 'Unknown Operator';
    const executorId = executor ? executor.id : null;

    // Whitelist bypass check
    const isWhitelistedUser = settings?.whitelist?.users?.includes(executorId);
    let isWhitelistedRole = false;
    try {
      if (executorId) {
        const member = await channel.guild.members.fetch(executorId);
        if (member) {
          isWhitelistedRole = member.roles?.cache?.some(r => settings?.whitelist?.roles?.includes(r.id));
        }
      }
    } catch (e) {}

    if (isWhitelistedUser || isWhitelistedRole) {
      addGuildAudit(guildId, 'antinuke', 'BYPASS_WHITELIST', `AntiNuke trigger ignored (Channel Deletion): Operator ${executorTag} is whitelisted.`, 'NexusBot AntiNuke');
      return;
    }

    addGuildAudit(guildId, 'antinuke', 'SHIELD_TRIGGER', `CRITICAL SHIELD TRIGGER: Channel deletion threshold exceeded (${deletions.length}/${threshold} in 60s). Operator: ${executorTag}`, 'NexusBot AntiNuke');

    if (executorId && executorId !== channel.guild.ownerId) {
      try {
        const member = await channel.guild.members.fetch(executorId);
        if (member) {
          // 1. Strip Administrator permissions (Remove all high roles) if enabled
          if (settings.antinuke.unauthorizedAdminStrip !== false) {
            const removableRoles = member.roles.cache.filter(role => role.name !== '@everyone' && role.permissions.has('Administrator'));
            if (removableRoles.size > 0) {
              await member.roles.remove(removableRoles, 'NexusBot AntiNuke: Emergency Demotion (Admin abuse)');
              addGuildAudit(guildId, 'antinuke', 'ADMIN_STRIP', `Stripped ${removableRoles.size} admin roles from offending operator ${executorTag}`, 'NexusBot AntiNuke');
            }
          }

          // 2. Perform defined threat action
          const action = settings.antinuke.action || 'remove_roles';
          if (action === 'ban') {
            await member.send(`🚨 You have been banned from **${channel.guild.name}** for breaching the Anti-Nuke security thresholds.`).catch(() => {});
            await member.ban({ reason: 'NexusBot AntiNuke: Exceeded channel deletion threshold' });
            addGuildAudit(guildId, 'antinuke', 'MEMBER_BAN', `Banned offending operator ${executorTag}`, 'NexusBot AntiNuke');
          } else if (action === 'kick') {
            await member.send(`🚨 You have been kicked from **${channel.guild.name}** for breaching the Anti-Nuke security thresholds.`).catch(() => {});
            await member.kick('NexusBot AntiNuke: Exceeded channel deletion threshold');
            addGuildAudit(guildId, 'antinuke', 'MEMBER_KICK', `Kicked offending operator ${executorTag}`, 'NexusBot AntiNuke');
          } else if (action === 'timeout') {
            await member.timeout(1000 * 60 * 60 * 24 * 7, 'NexusBot AntiNuke: Exceeded channel deletion threshold');
            addGuildAudit(guildId, 'antinuke', 'MEMBER_TIMEOUT', `Timed out offending operator ${executorTag} for 7 days`, 'NexusBot AntiNuke');
          }
        }
      } catch (err) {
        console.error('Failed to punish offender in AntiNuke:', err.message);
      }
    }
  }
}
