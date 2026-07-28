// nexus bot
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';

// Path Helper for isolated guild storage relative to workspace root
export const DATA_DIR = path.join(process.cwd(), 'data', 'servers');

/**
 * Helper to ensure a guild directory and its JSON storage databases exist.
 */
export function ensureGuildStorage(guildId) {
  const guildDir = path.join(DATA_DIR, guildId);
  if (!fs.existsSync(guildDir)) {
    fs.mkdirSync(guildDir, { recursive: true });
  }

  const files = {
    'settings.json': {
      enabled: false,
      logging: {
        enabled: false,
        logChannelId: ''
      },
      welcome: {
        enabled: false,
        channelId: '',
        mode: 'embed',
        title: '',
        description: '',
        color: '#5865F2',
        showServerIcon: false,
        showUserAvatar: false,
        bottomImage: '',
        footerText: '',
        footerIcon: '',
        mentionUser: false
      },
      automod: {
        enabled: false,
        logChannelId: '',
        spamFilter: false,
        linkFilter: false,
        inviteFilter: false,
        mentionLimit: 0,
        capsFilter: false,
        badWords: [],
        action: 'delete',
        duplicateFilter: false,
        regexPatterns: [],
        emojiLimit: 0,
        maliciousLinkFilter: false,
        enforceStaff: false,
        massMentionLimit: 0,
        spamMsgLimit: 5,
        spamTimeWindow: 10,
        warnLimitEnabled: false,
        warnLimitMax: 3,
        warnLimitAction: 'timeout',
        warnLimitDuration: '24h'
      },
      antiraid: {
        enabled: false,
        logChannelId: '',
        joinRateThreshold: 0,
        quarantineNewAccounts: false,
        accountAgeMinDays: 0,
        lockdownOnAttack: false,
        action: 'timeout',
        velocityJoins: 0,
        velocitySeconds: 0,
        autoVerificationLevel: false,
        captchaVerification: false
      },
      antinuke: {
        enabled: false,
        logChannelId: '',
        channelCreateThreshold: 0,
        channelDeleteThreshold: 0,
        roleDeleteThreshold: 0,
        webhookThreshold: 0,
        action: 'remove_roles',
        preventBotInvites: false,
        banThreshold: 0,
        kickThreshold: 0,
        unauthorizedAdminStrip: false,
        roleCreateThreshold: 0
      },
      tickets: {
        enabled: false,
        panelTitle: '',
        panelDescription: '',
        useDropdown: false,
        categories: []
      },
      dms: {
        enabled: true,
        allowDmCommand: true,
        allowDmRollCommand: true,
        allowDmGlobalCommand: true
      },
      whitelist: {
        roles: [],
        users: []
      }
    },
    'warnings.json': [],
    'backups.json': [],
    'invites.json': [],
    'tickets_live.json': [],
    'audits.jsonl': ''
  };

  for (const [filename, defaultData] of Object.entries(files)) {
    const filePath = path.join(guildDir, filename);
    if (!fs.existsSync(filePath)) {
      if (filename.endsWith('.jsonl')) {
        fs.writeFileSync(filePath, defaultData);
      } else {
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
      }
    }
  }
}

/**
 * Load settings for a guild
 */
export function getGuildSettings(guildId) {
  ensureGuildStorage(guildId);
  const filePath = path.join(DATA_DIR, guildId, 'settings.json');
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`Error reading settings for guild ${guildId}`, err);
    return {};
  }
}

/**
 * Save settings for a guild
 */
export function saveGuildSettings(guildId, data) {
  ensureGuildStorage(guildId);
  const filePath = path.join(DATA_DIR, guildId, 'settings.json');
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Add an audit log entry for a guild
 */
export function addGuildAudit(guildId, moduleName, action, reason, executorTag = 'SYSTEM') {
  ensureGuildStorage(guildId);
  const filePath = path.join(DATA_DIR, guildId, 'audits.jsonl');
  const auditId = 'evt-' + Math.random().toString(36).substring(2, 8);
  const caseIdNum = Math.floor(Math.random() * 5000) + 10000;
  
  const entry = {
    eventId: auditId,
    caseId: `NX-0${caseIdNum}`,
    guildId,
    module: moduleName,
    action,
    executorId: 'sys-node',
    executorTag,
    reason,
    status: 'success',
    createdAt: new Date().toLocaleTimeString('en-US', { hour12: false })
  };

  fs.appendFileSync(filePath, JSON.stringify(entry) + '\n');
}

/**
 * Get all audits for a guild
 */
export function getGuildAudits(guildId) {
  ensureGuildStorage(guildId);
  const filePath = path.join(DATA_DIR, guildId, 'audits.jsonl');
  try {
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (!raw) return [];
    return raw.split('\n').map(line => JSON.parse(line)).reverse();
  } catch (err) {
    return [];
  }
}
