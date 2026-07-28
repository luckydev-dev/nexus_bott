// nexus bot
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { PermissionFlagsBits } from 'discord.js';
import { DATA_DIR, getGuildSettings, addGuildAudit } from '../storage.js';
import { logWarnLimitReached } from './logger.js';
import { statusEmoji } from './statusEmojis.js';

function parseDuration(durationStr) {
  if (!durationStr || typeof durationStr !== 'string') return { ms: 24 * 60 * 60 * 1000, display: '24 hours' };
  const str = durationStr.trim().toLowerCase();
  const match = str.match(/^(\d+)\s*([smhd])$/);
  if (!match) return { ms: 24 * 60 * 60 * 1000, display: str || '24 hours' };
  const num = parseInt(match[1], 10);
  const unit = match[2];
  if (unit === 's') return { ms: num * 1000, display: `${num} second(s)` };
  if (unit === 'm') return { ms: num * 60 * 1000, display: `${num} minute(s)` };
  if (unit === 'h') return { ms: num * 60 * 60 * 1000, display: `${num} hour(s)` };
  if (unit === 'd') return { ms: num * 24 * 60 * 60 * 1000, display: `${num} day(s)` };
  return { ms: 24 * 60 * 60 * 1000, display: '24 hours' };
}

/**
 * Issues a warning to a member, records it in storage,
 * and checks/executes the threshold punishment if max warnings are reached.
 */
export async function issueWarning({
  guild,
  targetUser,
  reason,
  source = 'manual',
  executorId = 'system',
  executorTag = 'Nexus Bot'
}) {
  const guildId = guild.id;
  const settings = getGuildSettings(guildId);
  const warningsPath = path.join(DATA_DIR, guildId, 'warnings.json');

  let warnings = [];
  try {
    if (fs.existsSync(warningsPath)) {
      warnings = JSON.parse(fs.readFileSync(warningsPath, 'utf8'));
    }
  } catch (e) {
    warnings = [];
  }

  const caseIdNum = warnings.length + 12395;
  const newWarn = {
    id: `warn-${warnings.length + 1}`,
    guildId,
    memberId: targetUser.id,
    memberTag: targetUser.tag,
    reason,
    source,
    createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    executorId,
    executorTag,
    caseId: `NX-0${caseIdNum}`,
    active: true
  };

  warnings.push(newWarn);
  fs.writeFileSync(warningsPath, JSON.stringify(warnings, null, 2));

  addGuildAudit(
    guildId,
    'moderation',
    'MEMBER_WARN',
    `Formally warned ${targetUser.tag} for: ${reason} [Source: ${source}]`,
    executorTag
  );

  let punishmentTriggered = false;
  let punishmentSuccess = false;
  let punishmentMessage = '';
  let activeCount = warnings.filter(w => w.memberId === targetUser.id && w.active !== false).length;

  const warnLimitEnabled = settings.automod?.warnLimitEnabled !== false;
  const maxWarnLimit = settings.automod?.warnLimitMax ?? 3;

  if (warnLimitEnabled && activeCount >= maxWarnLimit) {
    punishmentTriggered = true;
    const punishmentAction = settings.automod?.warnLimitAction || 'timeout';
    const isOwner = targetUser.id === guild.ownerId;

    logWarnLimitReached(guild, targetUser, maxWarnLimit, punishmentAction);

    if (isOwner) {
      punishmentMessage = `reached the warning limit of **${maxWarnLimit}**, but cannot be punished (Server Owner).`;
    } else {
      let member = null;
      try {
        member = await guild.members.fetch(targetUser.id);
      } catch (e) {
        console.error('Failed to fetch guild member for punishment:', e.message);
      }

      if (member) {
        const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null));

        if (punishmentAction === 'timeout') {
          try {
            const rawDuration = settings.automod?.warnLimitDuration || '24h';
            const { ms, display } = parseDuration(rawDuration);

            // Check if member has Administrator permission or higher role
            const hasAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
            const isRoleBelowBot = botMember && member.roles.highest.position < botMember.roles.highest.position;

            // Discord API prevents timeout on members with Administrator permission.
            // If member has Administrator permission but their role is below the bot, strip admin roles first so timeout succeeds!
            if (hasAdmin && isRoleBelowBot) {
              const adminRoles = member.roles.cache.filter(
                role => role.name !== '@everyone' && role.permissions.has(PermissionFlagsBits.Administrator)
              );
              if (adminRoles.size > 0) {
                await member.roles.remove(adminRoles, `Nexus Bot AutoMod: Stripping Admin permission for Warning Punishment Timeout`);
                addGuildAudit(guildId, 'automod', 'ADMIN_STRIP', `Stripped ${adminRoles.size} admin roles from ${targetUser.tag} to apply warning limit timeout.`, 'Nexus Bot AutoMod');
              }
            }

            await member.timeout(ms, `Warning Limit Reached (${maxWarnLimit} warnings)`);
            addGuildAudit(guildId, 'automod', 'MEMBER_TIMEOUT', `Muted ${targetUser.tag} for ${rawDuration} (${display}) - reached warning limit (${maxWarnLimit})`, 'Nexus Bot AutoMod');
            
            punishmentSuccess = true;
            punishmentMessage = `has reached the warning limit of **${maxWarnLimit}** and has been **MUTED** for **${rawDuration}**. Active warnings reset.`;
          } catch (err) {
            console.error('Warning punishment timeout failed:', err.message);
            punishmentSuccess = false;
            punishmentMessage = `has reached the warning limit of **${maxWarnLimit}**, but timeout failed: ${err.message}`;
          }
        } else if (punishmentAction === 'kick') {
          try {
            await member.kick(`Warning Limit Reached (${maxWarnLimit} warnings)`);
            addGuildAudit(guildId, 'automod', 'MEMBER_KICK', `Kicked ${targetUser.tag} - reached warning limit (${maxWarnLimit})`, 'Nexus Bot AutoMod');
            punishmentSuccess = true;
            punishmentMessage = `has reached the warning limit of **${maxWarnLimit}** and has been **KICKED**. Active warnings reset.`;
          } catch (err) {
            console.error('Warning punishment kick failed:', err.message);
            punishmentSuccess = false;
            punishmentMessage = `has reached the warning limit of **${maxWarnLimit}**, but kick failed: ${err.message}`;
          }
        } else if (punishmentAction === 'ban') {
          try {
            await member.ban({ reason: `Warning Limit Reached (${maxWarnLimit} warnings)` });
            addGuildAudit(guildId, 'automod', 'MEMBER_BAN', `Banned ${targetUser.tag} - reached warning limit (${maxWarnLimit})`, 'Nexus Bot AutoMod');
            punishmentSuccess = true;
            punishmentMessage = `has reached the warning limit of **${maxWarnLimit}** and has been **BANNED**. Active warnings reset.`;
          } catch (err) {
            console.error('Warning punishment ban failed:', err.message);
            punishmentSuccess = false;
            punishmentMessage = `has reached the warning limit of **${maxWarnLimit}**, but ban failed: ${err.message}`;
          }
        } else if (punishmentAction === 'none') {
          punishmentSuccess = true;
          punishmentMessage = `reached the warning limit of **${maxWarnLimit}** (No action configured).`;
          addGuildAudit(guildId, 'automod', 'WARN_LIMIT_REACHED', `${targetUser.tag} reached warning limit (${maxWarnLimit}). No punishment configured.`, 'Nexus Bot AutoMod');
        }
      } else {
        punishmentMessage = `reached warning limit of **${maxWarnLimit}**, but member could not be found in server.`;
      }
    }

    // Reset warnings ONLY if punishment succeeded (or owner / action none)
    if (punishmentSuccess || isOwner) {
      warnings.forEach(w => {
        if (w.memberId === targetUser.id) {
          w.active = false;
        }
      });
      fs.writeFileSync(warningsPath, JSON.stringify(warnings, null, 2));
      activeCount = 0;
    }
  }

  return {
    warn: newWarn,
    caseId: `NX-0${caseIdNum}`,
    activeCount,
    punishmentTriggered,
    punishmentSuccess,
    punishmentMessage
  };
}
