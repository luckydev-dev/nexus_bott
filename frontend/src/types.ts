/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GuildMetadata {
  id: string;
  name: string;
  icon: string;
  memberCount: number;
  ownerId: string;
}

export interface AutoModConfig {
  enabled: boolean;
  logChannelId: string;
  spamFilter: boolean;
  linkFilter: boolean;
  inviteFilter: boolean;
  mentionLimit: number;
  capsFilter: boolean;
  badWords: string[];
  action: 'delete' | 'warn' | 'timeout' | 'mute' | 'kick' | 'ban' | 'log_only';
  duplicateFilter?: boolean;
  regexPatterns?: string[];
  emojiLimit?: number;
  maliciousLinkFilter?: boolean;
  enforceStaff?: boolean;
  massMentionLimit?: number;
  spamMsgLimit?: number;
  spamTimeWindow?: number;
  ignoredRoles?: string[];
  ignoredChannels?: string[];
  warnLimitEnabled?: boolean;
  warnLimitMax?: number;
  warnLimitAction?: 'timeout' | 'kick' | 'ban' | 'none';
  warnLimitDuration?: string;
}

export interface AntiRaidConfig {
  enabled: boolean;
  logChannelId: string;
  joinRateThreshold: number; // joins per 10s
  quarantineNewAccounts: boolean;
  accountAgeMinDays: number;
  lockdownOnAttack: boolean;
  action: 'log_only' | 'timeout' | 'mute' | 'kick' | 'ban';
  velocityJoins?: number;
  velocitySeconds?: number;
  autoVerificationLevel?: boolean;
  captchaVerification?: boolean;
  verificationChannelId?: string;
  maxUnverifiedAgeMinutes?: number;
  notifyQuarantineStaff?: boolean;
}

export interface AntiNukeConfig {
  enabled: boolean;
  logChannelId: string;
  channelCreateThreshold: number;
  channelDeleteThreshold: number;
  roleDeleteThreshold: number;
  webhookThreshold: number;
  action: 'log_only' | 'remove_roles' | 'timeout' | 'mute' | 'kick' | 'ban' | 'lockdown';
  preventBotInvites?: boolean;
  banThreshold?: number;
  kickThreshold?: number;
  unauthorizedAdminStrip?: boolean;
  roleCreateThreshold?: number;
  guildUpdateThreshold?: number;
  botAddThreshold?: number;
  restoreTemplatesEnabled?: boolean;
}

export interface LoggingConfig {
  enabled: boolean;
  logChannelId: string;
}

export interface BackupMetadata {
  id: string;
  guildId: string;
  guildName: string;
  creatorId: string;
  creatorName: string;
  createdAt: string;
  channelCount: number;
  roleCount: number;
  recoveryHash: string; // SHA256 of the recovery code
}

export interface AuditRecord {
  eventId: string;
  caseId: string;
  guildId: string;
  module: string;
  action: string;
  executorId: string;
  executorTag: string;
  targetId?: string;
  targetTag?: string;
  reason: string;
  status: 'success' | 'failed';
  createdAt: string;
}

export interface WarningRecord {
  id: string;
  guildId: string;
  memberId: string;
  memberTag: string;
  reason: string;
  source: 'manual' | 'automod' | 'antiraid' | 'antinuke';
  createdAt: string;
  executorId: string;
  executorTag: string;
  caseId: string;
  active: boolean;
}

export interface InviteStats {
  memberId: string;
  memberTag: string;
  real: number;
  fake: number;
  rejoin: number;
  left: number;
  total: number;
}

export interface DiscordChannel {
  id: string;
  name: string;
  locked: boolean;
}
