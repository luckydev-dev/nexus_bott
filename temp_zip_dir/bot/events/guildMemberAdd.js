/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmbedBuilder } from 'discord.js';
import { getGuildSettings, addGuildAudit } from '../storage.js';
import { logAntiRaidTrigger } from '../utils/logger.js';
import { issueWarning } from '../utils/warnings.js';

// In-memory join velocity tracker
const joinHistory = new Map(); // guildId -> array of timestamps
let lastRaidDetectionTime = 0;

export default async function handleGuildMemberAdd(member) {
  const guildId = member.guild.id;
  const settings = getGuildSettings(guildId);

  // Whitelist bypass check
  const isWhitelistedUser = settings?.whitelist?.users?.includes(member.user.id);
  const isWhitelistedRole = member.roles?.cache?.some(r => settings?.whitelist?.roles?.includes(r.id));
  if (isWhitelistedUser || isWhitelistedRole) {
    return; // Completely bypass whitelisted users and roles
  }

  // AntiRaid Account Age and Velocity Protection
  if (settings?.antiraid?.enabled) {
    const now = Date.now();

    // 1. Velocity Join Tracking (Join Rate Threshold)
    const vJoinsLimit = settings.antiraid.velocityJoins || settings.antiraid.joinRateThreshold || 8;
    const vSecondsWindow = (settings.antiraid.velocitySeconds || 10) * 1000;

    let joins = joinHistory.get(guildId) || [];
    joins.push(now);
    joins = joins.filter(t => now - t < vSecondsWindow);
    joinHistory.set(guildId, joins);

    let currentRaidDetected = false;

    if (joins.length > vJoinsLimit || (now - lastRaidDetectionTime < 180000)) { // 3 min cool-down window
      currentRaidDetected = true;
      if (joins.length > vJoinsLimit) {
        lastRaidDetectionTime = now;
        addGuildAudit(guildId, 'antiraid', 'RAID_DETECTED', `CRITICAL RAID DETECTED: Join velocity exceeded (${joins.length} joins / ${vSecondsWindow / 1000}s window). Activating auto-defenses!`, 'NexusBot AntiRaid');
        
        // Auto Verification level bump if requested
        if (settings.antiraid.autoVerificationLevel) {
          try {
            await member.guild.setVerificationLevel(4); // VERY_HIGH (must have verified phone)
            addGuildAudit(guildId, 'antiraid', 'VERIFICATION_LEVEL_BUMP', 'Raised guild verification level to VERY_HIGH to deter raid bots.', 'NexusBot AntiRaid');
          } catch (e) {
            console.error('Failed to raise verification level:', e.message);
          }
        }
      }
    }

    // 2. Account Age Filter
    const ageInDays = (now - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
    const ageThreshold = settings.antiraid.accountAgeMinDays || 0;
    const isNewAccount = ageInDays < ageThreshold;

    if (currentRaidDetected || isNewAccount) {
      const isRaidBypass = false; // Add exceptions if desired
      const flagReason = currentRaidDetected 
        ? `Active Server Raid protection (Velocity: ${joins.length} joins)` 
        : `Suspected Alt/Raid bot (Account age: ${Math.round(ageInDays * 10) / 10} days < ${ageThreshold} days)`;

      addGuildAudit(guildId, 'antiraid', 'JOIN_QUARANTINE', `Intercepted member ${member.user.tag} - Reason: ${flagReason}`, 'NexusBot AntiRaid');

      const raidAction = currentRaidDetected ? settings.antiraid.action : (settings.antiraid.action || 'timeout');
      const detailText = `**User**: <@${member.user.id}> (${member.user.tag})\n**Account Age**: ${Math.round(ageInDays * 10) / 10} days\n**Join Velocity**: ${joins.length} in window\n**Flagged Reason**: ${flagReason}`;
      
      logAntiRaidTrigger(member.guild, member.user, flagReason, raidAction, detailText);

      // Issue warning via unified warning engine
      await issueWarning({
        guild: member.guild,
        targetUser: member.user,
        reason: `[AntiRaid] ${flagReason}`,
        source: 'antiraid',
        executorId: 'system-antiraid',
        executorTag: 'Nexus Bot AntiRaid'
      }).catch(() => {});

      try {

        if (raidAction === 'timeout') {
          await member.timeout(1000 * 60 * 60 * 24, `NexusBot AntiRaid: ${flagReason}`);
          await member.send(`🔒 You have been timed out/quarantined temporarily in **${member.guild.name}** due to security alert: ${flagReason}`).catch(() => {});
        } else if (raidAction === 'kick') {
          await member.send(`🔒 You were kicked from **${member.guild.name}** under server security guidelines: ${flagReason}`).catch(() => {});
          await member.kick(`NexusBot AntiRaid: ${flagReason}`);
        } else if (raidAction === 'ban') {
          await member.send(`🔒 You have been banned from **${member.guild.name}** for security safety: ${flagReason}`).catch(() => {});
          await member.ban({ reason: `NexusBot AntiRaid: ${flagReason}` });
        }
      } catch (e) {
        console.error('Failed to run security action on member:', e.message);
      }
    }
  }
}
