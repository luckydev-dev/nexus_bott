// nexus bot
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuditLogEvent } from 'discord.js';
import { getGuildSettings, addGuildAudit } from '../storage.js';
import { logAntiNukeTrigger } from '../utils/logger.js';
import { issueWarning } from '../utils/warnings.js';

// In-memory counters for Anti-Nuke
const roleDeletionTrackers = new Map(); // guildId -> array of timestamps
const roleCreationTrackers = new Map(); // guildId -> array of timestamps
const channelCreationTrackers = new Map(); // guildId -> array of timestamps
const banTrackers = new Map(); // guildId -> array of timestamps
const kickTrackers = new Map(); // guildId -> array of timestamps

/**
 * Common method to punish an operator breaching Anti-Nuke limits.
 */
async function punishCulprit(guild, executor, actionType, threshold, count, reasonText) {
  if (!executor || executor.id === guild.ownerId) return;
  const guildId = guild.id;
  const settings = getGuildSettings(guildId);

  // Whitelist bypass check
  const isWhitelistedUser = settings?.whitelist?.users?.includes(executor.id);
  let isWhitelistedRole = false;
  try {
    const member = await guild.members.fetch(executor.id);
    if (member) {
      isWhitelistedRole = member.roles?.cache?.some(r => settings?.whitelist?.roles?.includes(r.id));
    }
  } catch (e) {}

  if (isWhitelistedUser || isWhitelistedRole) {
    addGuildAudit(guildId, 'antinuke', 'BYPASS_WHITELIST', `AntiNuke trigger ignored: Operator ${executor.tag} is whitelisted.`, 'NexusBot AntiNuke');
    return;
  }

  addGuildAudit(guildId, 'antinuke', 'SHIELD_TRIGGER', `EXHAUSTIVE SHIELD TRIGGER: ${reasonText} (${count}/${threshold}). Culprit: ${executor.tag}`, 'NexusBot AntiNuke');

  // Issue warning via warning system
  await issueWarning({
    guild,
    targetUser: executor,
    reason: `[AntiNuke] ${reasonText}`,
    source: 'antinuke',
    executorId: 'system-antinuke',
    executorTag: 'Nexus Bot AntiNuke'
  }).catch(() => {});

  const action = settings.antinuke?.action || 'remove_roles';
  const hasAdminStrip = settings.antinuke?.unauthorizedAdminStrip !== false;
  const detailText = `Emergency Admin Strip of high roles was **${hasAdminStrip ? 'APPLIED (Administrator roles removed)' : 'DISABLED (or roles not present)'}**.`;
  logAntiNukeTrigger(guild, executor, reasonText, action, count, threshold, detailText);

  try {
    const member = await guild.members.fetch(executor.id);
    if (member) {
      // 1. Strip Administrator roles if enabled
      if (settings.antinuke?.unauthorizedAdminStrip !== false) {
        const removableRoles = member.roles.cache.filter(role => role.name !== '@everyone' && role.permissions.has('Administrator'));
        if (removableRoles.size > 0) {
          await member.roles.remove(removableRoles, 'NexusBot AntiNuke: Extreme Admin Strip');
          addGuildAudit(guildId, 'antinuke', 'ADMIN_STRIP', `Emergency stripped ${removableRoles.size} admin roles from ${executor.tag}`, 'NexusBot AntiNuke');
        }
      }

      // 2. Perform defined threat action
      if (action === 'ban') {
        await member.send(`🚨 You have been banned from **${guild.name}** for breaching the Anti-Nuke safety limit: ${reasonText}`).catch(() => {});
        await member.ban({ reason: `NexusBot AntiNuke: Exceeded threshold for ${actionType}` });
        addGuildAudit(guildId, 'antinuke', 'MEMBER_BAN', `Banned culprit ${executor.tag}`, 'NexusBot AntiNuke');
      } else if (action === 'kick') {
        await member.send(`🚨 You have been kicked from **${guild.name}** for breaching the Anti-Nuke safety limit: ${reasonText}`).catch(() => {});
        await member.kick(`NexusBot AntiNuke: Exceeded threshold for ${actionType}`);
        addGuildAudit(guildId, 'antinuke', 'MEMBER_KICK', `Kicked culprit ${executor.tag}`, 'NexusBot AntiNuke');
      } else if (action === 'timeout') {
        await member.timeout(1000 * 60 * 60 * 24 * 7, `NexusBot AntiNuke: Exceeded threshold for ${actionType}`);
        addGuildAudit(guildId, 'antinuke', 'MEMBER_TIMEOUT', `Timed out culprit ${executor.tag} for 7 days`, 'NexusBot AntiNuke');
      }
    }
  } catch (err) {
    console.error('Failed to punish offender in AntiNuke extreme handler:', err.message);
  }
}

/**
 * Handle Role Deletion event
 */
export async function handleRoleDelete(role) {
  const guild = role.guild;
  if (!guild) return;
  const settings = getGuildSettings(guild.id);
  if (!settings?.antinuke?.enabled) return;

  const now = Date.now();
  let roleDeletions = roleDeletionTrackers.get(guild.id) || [];
  roleDeletions.push(now);
  roleDeletions = roleDeletions.filter(t => now - t < 60000); // 1 minute window
  roleDeletionTrackers.set(guild.id, roleDeletions);

  const threshold = settings.antinuke.roleDeleteThreshold || 3;
  if (roleDeletions.length > threshold) {
    let executor = null;
    try {
      const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleDelete });
      const entry = auditLogs.entries.first();
      if (entry && (now - entry.createdTimestamp < 10000)) {
        executor = entry.executor;
      }
    } catch (e) {
      console.error('AntiNuke (RoleDelete) Audit logs fail:', e.message);
    }
    await punishCulprit(guild, executor, 'role_delete', threshold, roleDeletions.length, 'Mass Role Deletion');
  }
}

/**
 * Handle Role Creation event
 */
export async function handleRoleCreate(role) {
  const guild = role.guild;
  if (!guild) return;
  const settings = getGuildSettings(guild.id);
  if (!settings?.antinuke?.enabled) return;

  const now = Date.now();
  let roleCreations = roleCreationTrackers.get(guild.id) || [];
  roleCreations.push(now);
  roleCreations = roleCreations.filter(t => now - t < 60000);
  roleCreationTrackers.set(guild.id, roleCreations);

  const threshold = settings.antinuke.roleCreateThreshold || 5; // Default 5 roles
  if (roleCreations.length > threshold) {
    let executor = null;
    try {
      const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleCreate });
      const entry = auditLogs.entries.first();
      if (entry && (now - entry.createdTimestamp < 10000)) {
        executor = entry.executor;
      }
    } catch (e) {
      console.error('AntiNuke (RoleCreate) Audit logs fail:', e.message);
    }
    await punishCulprit(guild, executor, 'role_create', threshold, roleCreations.length, 'Mass Role Creation');
  }
}

/**
 * Handle Channel Creation event
 */
export async function handleChannelCreate(channel) {
  const guild = channel.guild;
  if (!guild) return;
  const settings = getGuildSettings(guild.id);
  if (!settings?.antinuke?.enabled) return;

  const now = Date.now();
  let channelCreations = channelCreationTrackers.get(guild.id) || [];
  channelCreations.push(now);
  channelCreations = channelCreations.filter(t => now - t < 60000);
  channelCreationTrackers.set(guild.id, channelCreations);

  const threshold = settings.antinuke.channelCreateThreshold || 4;
  if (channelCreations.length > threshold) {
    let executor = null;
    try {
      const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelCreate });
      const entry = auditLogs.entries.first();
      if (entry && (now - entry.createdTimestamp < 10000)) {
        executor = entry.executor;
      }
    } catch (e) {
      console.error('AntiNuke (ChannelCreate) Audit logs fail:', e.message);
    }
    await punishCulprit(guild, executor, 'channel_create', threshold, channelCreations.length, 'Mass Channel Creation');
  }
}

/**
 * Handle Guild Ban event (Mass Ban Detection)
 */
export async function handleGuildBanAdd(ban) {
  const guild = ban.guild;
  if (!guild) return;
  const settings = getGuildSettings(guild.id);
  if (!settings?.antinuke?.enabled) return;

  const now = Date.now();
  let bans = banTrackers.get(guild.id) || [];
  bans.push(now);
  bans = bans.filter(t => now - t < 60000);
  banTrackers.set(guild.id, bans);

  const threshold = settings.antinuke.banThreshold || 3;
  if (bans.length > threshold) {
    let executor = null;
    try {
      const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd });
      const entry = auditLogs.entries.first();
      if (entry && (now - entry.createdTimestamp < 10000)) {
        executor = entry.executor;
      }
    } catch (e) {
      console.error('AntiNuke (BanAdd) Audit logs fail:', e.message);
    }
    await punishCulprit(guild, executor, 'member_ban', threshold, bans.length, 'Mass Member Banning');
  }
}

/**
 * Handle Guild Member Remove event (Mass Kick Detection)
 */
export async function handleGuildMemberRemove(member) {
  const guild = member.guild;
  if (!guild) return;
  const settings = getGuildSettings(guild.id);
  if (!settings?.antinuke?.enabled) return;

  const now = Date.now();
  // Check if this member removal was a kick
  let executor = null;
  try {
    const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberKick });
    const entry = auditLogs.entries.first();
    if (entry && (now - entry.createdTimestamp < 10000) && entry.target.id === member.id) {
      executor = entry.executor;
    }
  } catch (e) {
    // If we cannot fetch audit logs, we cannot reliably verify if it's a kick vs leave
  }

  if (executor) {
    let kicks = kickTrackers.get(guild.id) || [];
    kicks.push(now);
    kicks = kicks.filter(t => now - t < 60000);
    kickTrackers.set(guild.id, kicks);

    const threshold = settings.antinuke.kickThreshold || 3;
    if (kicks.length > threshold) {
      await punishCulprit(guild, executor, 'member_kick', threshold, kicks.length, 'Mass Member Kicking');
    }
  }
}
