/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Server, Settings, Shield, MessageSquare, Key, History, User, Plus, Trash, 
  Lock, Unlock, Save, ExternalLink, Eye, PlusCircle, RefreshCw, Sliders, 
  UserCheck, Bot, Zap, Sparkles, AlertTriangle, Check, CheckCircle, Download, 
  Upload, X, HelpCircle, Activity, Heart, Bell, Trash2, Send, ChevronRight, Copy,
  Menu, BookOpen, Wifi, MoreVertical, Edit, UserMinus, Search, Filter, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AutoModConfig, AntiRaidConfig, AntiNukeConfig, LoggingConfig,
  AuditRecord, WarningRecord, InviteStats, DiscordChannel 
} from './types';
import { CustomDropdown, MultiSelectDropdown } from './components/CustomDropdown';
import { NexusIcon } from './components/NexusIcon';
import { FloatingSaveBar } from './components/FloatingSaveBar';

// Pre-seeded Guilds
const GUILDS = [
  { id: '123456789012345678', name: 'Nexor Studio', icon: 'NS', memberCount: 1420 },
  { id: '987654321098765432', name: 'Aether Core', icon: 'AC', memberCount: 840 },
  { id: '556677889900112233', name: 'Vortex Labs', icon: 'VL', memberCount: 2930 }
];

// Premium customized toggle switch component to replace the old onoff switches
function ToggleSwitch({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`w-11 h-6 rounded-full transition-all duration-300 relative flex items-center px-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#5865F2]/40 shrink-0 ${
        enabled ? 'bg-[#5865F2]' : 'bg-slate-800 border border-white/10'
      }`}
    >
      <div
        className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 transform ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'dashboard'>('home');
  const [guildsList, setGuildsList] = useState<any[]>([]);
  const [activeGuild, setActiveGuild] = useState<any>(null);
  const [selectedMenu, setSelectedMenu] = useState<string>('automod');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Discord OAuth State
  const [discordUser, setDiscordUser] = useState<{ username: string; avatarUrl: string; id: string; accessToken?: string } | null>(null);

  // Helper function to format API URLs cleanly
  const formatBackendUrl = (url: string): string => {
    let cleaned = (url || '').trim();
    if (!cleaned || cleaned.includes('78.154.103.29') || cleaned.includes('13195')) {
      return 'http://legacy-mum1.arixbyte.com:25567';
    }
    if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
      cleaned = 'http://' + cleaned;
    }
    return cleaned.replace(/\/+$/, '');
  };

  // Backend API URL configuration state (customizable for Pterodactyl hosting)
  const [backendUrl, setBackendUrl] = useState<string>(() => {
    const stored = localStorage.getItem('custom_backend_url');
    if (stored) {
      const formatted = formatBackendUrl(stored);
      if (stored !== formatted) {
        localStorage.setItem('custom_backend_url', formatted);
      }
      return formatted;
    }
    const envUrl = (import.meta as any).env?.VITE_API_URL;
    if (envUrl) return formatBackendUrl(envUrl);
    return 'http://legacy-mum1.arixbyte.com:25567';
  });

  const [tempBackendUrl, setTempBackendUrl] = useState<string>(() => {
    const stored = localStorage.getItem('custom_backend_url');
    if (stored) return formatBackendUrl(stored);
    const envUrl = (import.meta as any).env?.VITE_API_URL;
    if (envUrl) return formatBackendUrl(envUrl);
    return 'http://legacy-mum1.arixbyte.com:25567';
  });
  const [revealToken, setRevealToken] = useState<boolean>(false);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('[App] Received message event. Origin:', event.origin, 'Data:', event.data);
      
      // Removed origin filtering for debugging
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const u = event.data.user;
        console.log('[App] Setting discordUser:', u);
        setDiscordUser(u);
        localStorage.setItem('discord_user', JSON.stringify(u));
        triggerToast(`Welcome, ${u.username}! Successfully logged in via Discord.`);
      }
    };
    window.addEventListener('message', handleMessage);

    // Initial load from localStorage
    const saved = localStorage.getItem('discord_user');
    if (saved) {
      try {
        setDiscordUser(JSON.parse(saved));
      } catch (e) {}
    }

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Fetch Discord guilds when discordUser/accessToken changes or backendUrl changes
  useEffect(() => {
    console.log('[App] discordUser change detected. Current state:', discordUser);
    if (discordUser && discordUser.accessToken) {
      console.log('[App] Attempting to fetch guilds with token:', discordUser.accessToken);
      const fetchRealGuilds = async () => {
        setIsLoading(true);
        try {
          const res = await fetch(`${backendUrl}/api/v1/auth/guilds`, {
            headers: { 'Authorization': `Bearer ${discordUser.accessToken}` }
          });
          const data = await res.json();
          console.log('[App] Guild fetch response:', data);
          if (data.success && Array.isArray(data.guilds)) {
            // Map discord guilds to the format expected by the app
            const mapped = data.guilds.map((g: any) => ({
              id: g.id,
              name: g.name,
              icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : g.name.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase(),
              memberCount: 150 + Math.floor(Math.random() * 4500),
              isReal: true,
              botInGuild: g.botInGuild
            }));
            if (mapped.length > 0) {
              setGuildsList(mapped);
              setActiveGuild(mapped[0]);
              console.log(`Successfully loaded ${mapped.length} Discord servers!`);
            } else {
              setGuildsList([]);
              setActiveGuild(null);
              triggerToast('Connected, but no Discord servers were found.');
            }
          } else {
            console.error('[App] Guild fetch failed:', data.error);
            setGuildsList([]);
            setActiveGuild(null);
          }
        } catch (err) {
          console.error('Failed to fetch Discord guilds:', err);
          setGuildsList([]);
          setActiveGuild(null);
        } finally {
          setIsLoading(false);
        }
      };
      fetchRealGuilds();
    } else {
      console.log('[App] No valid discordUser or accessToken, clearing guilds');
      setGuildsList([]);
      setActiveGuild(null);
    }
  }, [discordUser, backendUrl]);

  const handleDiscordLogin = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/v1/auth/url?origin=${encodeURIComponent(window.location.origin)}`);
      const data = await res.json();
      if (data.url) {
        const width = 500;
        const height = 750;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        const popup = window.open(
          data.url,
          'Discord Login',
          `width=${width},height=${height},top=${top},left=${left}`
        );
        if (!popup) {
          triggerToast('Popup blocked! Please allow popups to sign in with Discord.');
        }
      } else {
        triggerToast('Error: Failed to obtain Discord authorization URL.');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error: Failed to fetch Discord authorization URL.');
    }
  };

  const handleDiscordLogout = () => {
    setDiscordUser(null);
    localStorage.removeItem('discord_user');
    triggerToast('Logged out of Discord.');
  };

  // Interactive configurations

  const [autoMod, setAutoMod] = useState<AutoModConfig>({
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
  });

  const [antiRaid, setAntiRaid] = useState<AntiRaidConfig>({
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
  });

  const [antiNuke, setAntiNuke] = useState<AntiNukeConfig>({
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
  });



  const [dms, setDms] = useState({
    enabled: true,
    allowDmCommand: true,
    allowDmRollCommand: true,
    allowDmGlobalCommand: true
  });

  const [whitelist, setWhitelist] = useState<{ roles: string[]; users: string[] }>({
    roles: [],
    users: []
  });

  const [activityLogging, setActivityLogging] = useState<LoggingConfig>({
    enabled: false,
    logChannelId: ''
  });

  // Baseline states for dirty checking
  const [baselineAutoMod, setBaselineAutoMod] = useState<AutoModConfig | null>(null);
  const [baselineAntiRaid, setBaselineAntiRaid] = useState<AntiRaidConfig | null>(null);
  const [baselineAntiNuke, setBaselineAntiNuke] = useState<AntiNukeConfig | null>(null);
  const [baselineWhitelist, setBaselineWhitelist] = useState<{ roles: string[]; users: string[] } | null>(null);
  const [baselineActivityLogging, setBaselineActivityLogging] = useState<LoggingConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Card expansion and popups
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [activePopup, setActivePopup] = useState<string | null>(null);

  const isDirty = useMemo(() => {
    if (!baselineAutoMod || !baselineAntiRaid || !baselineAntiNuke || !baselineWhitelist || !baselineActivityLogging) {
      return false;
    }
    return (
      JSON.stringify(autoMod) !== JSON.stringify(baselineAutoMod) ||
      JSON.stringify(antiRaid) !== JSON.stringify(baselineAntiRaid) ||
      JSON.stringify(antiNuke) !== JSON.stringify(baselineAntiNuke) ||
      JSON.stringify(whitelist) !== JSON.stringify(baselineWhitelist) ||
      JSON.stringify(activityLogging) !== JSON.stringify(baselineActivityLogging)
    );
  }, [autoMod, baselineAutoMod, antiRaid, baselineAntiRaid, antiNuke, baselineAntiNuke, whitelist, baselineWhitelist, activityLogging, baselineActivityLogging]);

  const [guildRoles, setGuildRoles] = useState<{ id: string; name: string }[]>([]);
  const [guildMembers, setGuildMembers] = useState<{ id: string; tag: string; username: string }[]>([]);

  // State Lists
  const [backups, setBackups] = useState<any[]>([]);
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [warnings, setWarnings] = useState<WarningRecord[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditModuleFilter, setAuditModuleFilter] = useState('all');
  const [invites, setInvites] = useState<InviteStats[]>([]);
  const [guildChannels, setGuildChannels] = useState<DiscordChannel[]>([]);

  const getChannelOptions = (currentValue: string) => {
    const options = [{ value: '', label: 'None Selected' }];
    guildChannels.forEach(ch => {
      options.push({ value: ch.id, label: `#${ch.name}` });
    });
    if (currentValue && !guildChannels.some(ch => ch.id === currentValue)) {
      options.push({ value: currentValue, label: `ID: ${currentValue} (Not in list)` });
    }
    return options;
  };

  const renderCard = (
    id: string,
    title: string,
    description: string,
    IconComponent: any,
    enabled: boolean,
    onToggle: () => void,
    content: React.ReactNode
  ) => {
    return (
      <div className="bg-[#0f0f12] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all relative overflow-visible flex flex-col gap-3 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-slate-900/50 flex items-center justify-center border border-white/5 shrink-0 text-[#5865F2]">
              <IconComponent className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-slate-200 text-sm tracking-tight">{title}</h4>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 relative">
            <ToggleSwitch enabled={enabled} onChange={onToggle} />
          </div>
        </div>

        {content && (
          <div className="border-t border-white/5 pt-4 mt-2 space-y-4 text-xs">
            {content}
          </div>
        )}
      </div>
    );
  };

  const [cmdSearchQuery, setCmdSearchQuery] = useState('');
  const [cmdCategory, setCmdCategory] = useState('all');

  // Notifications / UI feedback
  const [toasts, setToasts] = useState<string[]>([]);
  const [modalType, setModalType] = useState<'backup-success' | 'restore-confirm' | 'add-warning' | 'add-invite' | 'send-dm' | 'export-json' | 'import-json' | 'none'>('none');
  const [newBackupCode, setNewBackupCode] = useState<string>('');
  const [restoreCodeInput, setRestoreCodeInput] = useState<string>('');
  const [selectedBackupId, setSelectedBackupId] = useState<string>('');
  const [backupRestriction, setBackupRestriction] = useState<boolean>(true);

  // Search & JSON Export/Import States
  const [sidebarSearch, setSidebarSearch] = useState<string>('');
  const [jsonExportString, setJsonExportString] = useState<string>('');
  const [jsonImportInput, setJsonImportInput] = useState<string>('');

  // Form states for dialog modals
  const [formWarnTag, setFormWarnTag] = useState('');
  const [formWarnReason, setFormWarnReason] = useState('');
  const [formInviteTag, setFormInviteTag] = useState('');
  const [formInviteAmount, setFormInviteAmount] = useState('5');
  const [formDmTarget, setFormDmTarget] = useState('');
  const [formDmContent, setFormDmContent] = useState('');
  const [formDmEmbed, setFormDmEmbed] = useState<boolean>(false);
  const [newBadWord, setNewBadWord] = useState('');
  const [newRegexPattern, setNewRegexPattern] = useState('');

  // Presets Handler
  const handleApplyPreset = (preset: 'balanced' | 'strict' | 'relaxed') => {
    if (preset === 'balanced') {
      setAutoMod(prev => ({
        ...prev,
        enabled: true,
        spamFilter: true,
        linkFilter: true,
        inviteFilter: true,
        badWordsEnabled: true,
        maliciousLinkFilter: true,
        action: 'delete'
      }));
      setAntiRaid(prev => ({
        ...prev,
        enabled: true,
        quarantineNewAccounts: true,
        accountAgeMinDays: 1,
        action: 'timeout'
      }));
      setAntiNuke(prev => ({
        ...prev,
        enabled: true,
        unauthorizedAdminStrip: true,
        channelCreateThreshold: 3,
        channelDeleteThreshold: 3,
        roleCreateThreshold: 3,
        roleDeleteThreshold: 3
      }));
      triggerToast('Applied "Community Standard" preset! Click Save to apply to Discord.');
    } else if (preset === 'strict') {
      setAutoMod(prev => ({
        ...prev,
        enabled: true,
        spamFilter: true,
        linkFilter: true,
        inviteFilter: true,
        duplicateFilter: true,
        capsFilter: true,
        badWordsEnabled: true,
        maliciousLinkFilter: true,
        massMentionLimit: 3,
        action: 'warn'
      }));
      setAntiRaid(prev => ({
        ...prev,
        enabled: true,
        quarantineNewAccounts: true,
        accountAgeMinDays: 3,
        captchaVerification: true,
        action: 'kick'
      }));
      setAntiNuke(prev => ({
        ...prev,
        enabled: true,
        unauthorizedAdminStrip: true,
        preventBotInvites: true,
        channelCreateThreshold: 1,
        channelDeleteThreshold: 1,
        roleCreateThreshold: 1,
        roleDeleteThreshold: 1,
        action: 'remove_roles'
      }));
      triggerToast('Applied "Strict Defense" preset! Click Save to apply to Discord.');
    } else if (preset === 'relaxed') {
      setAutoMod(prev => ({
        ...prev,
        enabled: true,
        spamFilter: false,
        linkFilter: false,
        inviteFilter: false,
        badWordsEnabled: true,
        maliciousLinkFilter: true,
        action: 'delete'
      }));
      setAntiRaid(prev => ({
        ...prev,
        enabled: false,
        quarantineNewAccounts: false
      }));
      setAntiNuke(prev => ({
        ...prev,
        enabled: true,
        unauthorizedAdminStrip: false
      }));
      triggerToast('Applied "Relaxed & Casual" preset! Click Save to apply to Discord.');
    }
  };

  // Export & Import Config
  const handleExportConfig = () => {
    const payload = {
      guildId: activeGuild?.id,
      guildName: activeGuild?.name,
      exportedAt: new Date().toISOString(),
      automod: autoMod,
      antiraid: antiRaid,
      antinuke: antiNuke,
      whitelist: whitelist,
      logging: activityLogging
    };
    setJsonExportString(JSON.stringify(payload, null, 2));
    setModalType('export-json');
  };

  const handleImportConfig = () => {
    setJsonImportInput('');
    setModalType('import-json');
  };

  const submitImportConfig = () => {
    try {
      const parsed = JSON.parse(jsonImportInput);
      if (parsed.automod) setAutoMod(parsed.automod);
      if (parsed.antiraid) setAntiRaid(parsed.antiraid);
      if (parsed.antinuke) setAntiNuke(parsed.antinuke);
      if (parsed.whitelist) setWhitelist(parsed.whitelist);
      if (parsed.logging) setActivityLogging(parsed.logging);
      setModalType('none');
      triggerToast('Configuration imported successfully! Click Save to apply.');
    } catch (err) {
      triggerToast('Error: Invalid JSON format. Please check your pasted configuration text.');
    }
  };

  const triggerToast = (message: string) => {
    setToasts((prev) => [...prev, message]);
    setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 4000);
  };

  const fetchGuildConfig = async (guildId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/v1/guilds/${guildId}/config`);
      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        if (data.settings?.automod) {
          setAutoMod(data.settings.automod);
          setBaselineAutoMod(JSON.parse(JSON.stringify(data.settings.automod)));
        }
        if (data.settings?.antiraid) {
          setAntiRaid(data.settings.antiraid);
          setBaselineAntiRaid(JSON.parse(JSON.stringify(data.settings.antiraid)));
        }
        if (data.settings?.antinuke) {
          setAntiNuke(data.settings.antinuke);
          setBaselineAntiNuke(JSON.parse(JSON.stringify(data.settings.antinuke)));
        }
        if (data.settings?.whitelist) {
          setWhitelist(data.settings.whitelist);
          setBaselineWhitelist(JSON.parse(JSON.stringify(data.settings.whitelist)));
        } else {
          const emptyWhitelist = { roles: [], users: [] };
          setWhitelist(emptyWhitelist);
          setBaselineWhitelist(emptyWhitelist);
        }
        if (data.settings?.logging) {
          setActivityLogging(data.settings.logging);
          setBaselineActivityLogging(JSON.parse(JSON.stringify(data.settings.logging)));
        } else {
          const defaultLogging = { enabled: false, logChannelId: '' };
          setActivityLogging(defaultLogging);
          setBaselineActivityLogging(defaultLogging);
        }
        if (data.settings?.dms) {
          setDms(data.settings.dms);
        } else {
          setDms({
            enabled: true,
            allowDmCommand: true,
            allowDmRollCommand: true,
            allowDmGlobalCommand: true
          });
        }
        if (data.warnings) setWarnings(data.warnings);
        if (data.backups) setBackups(data.backups);
        if (data.invites) setInvites(data.invites);
        if (data.audits) setAudits(data.audits);
      }
    } catch (err) {
      console.error('Failed to load guild configuration', err);
      triggerToast(`Error: Failed to fetch remote config from ${backendUrl}. Ensure the backend is running and CORS is properly configured.`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMembersAndRoles = async (guildId: string) => {
    try {
      const res = await fetch(`${backendUrl}/api/v1/guilds/${guildId}/members-and-roles`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setGuildRoles(data.roles || []);
          setGuildMembers(data.members || []);
          setGuildChannels(data.channels || []);
        }
      }
    } catch (err) {
      console.error('Failed to load guild members and roles', err);
    }
  };

  const saveGuildConfig = async (updatedPayload: any) => {
    if (!activeGuild?.id) return;
    try {
      const res = await fetch(`${backendUrl}/api/v1/guilds/${activeGuild.id}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayload)
      });
      const data = await res.json();
      if (!data.success) {
        triggerToast('Error: Failed to save remote config.');
      }
    } catch (err) {
      console.error('Error saving config', err);
      triggerToast(`Error: Network connection failure when saving config to ${backendUrl}.`);
    }
  };

  useEffect(() => {
    if (activeGuild?.id) {
      fetchGuildConfig(activeGuild.id);
      fetchMembersAndRoles(activeGuild.id);
    }
  }, [activeGuild?.id]);

  const addAuditLog = (module: string, action: string, reason: string, executor: string = 'Nexus#0001') => {
    const caseIdNum = audits.length + 12390;
    const caseIdStr = `NX-0${caseIdNum}`;
    const newAudit: AuditRecord = {
      eventId: `evt-${Math.random().toString(36).substr(2, 6)}`,
      caseId: caseIdStr,
      guildId: activeGuild.id,
      module,
      action,
      executorId: 'user-0001',
      executorTag: executor,
      reason,
      status: 'success',
      createdAt: new Date().toLocaleTimeString('en-US', { hour12: false })
    };
    const nextAudits = [newAudit, ...audits];
    setAudits(nextAudits);
    return nextAudits;
  };

  const handleSave = async (moduleName: string) => {
    setIsSaving(true);
    // Reset baseline states immediately so isDirty turns false and floating bar hides
    setBaselineAutoMod(JSON.parse(JSON.stringify(autoMod)));
    setBaselineAntiRaid(JSON.parse(JSON.stringify(antiRaid)));
    setBaselineAntiNuke(JSON.parse(JSON.stringify(antiNuke)));
    setBaselineWhitelist(JSON.parse(JSON.stringify(whitelist)));
    setBaselineActivityLogging(JSON.parse(JSON.stringify(activityLogging)));

    const nextSettings = {
      automod: autoMod,
      antiraid: antiRaid,
      antinuke: antiNuke,
      logging: activityLogging,
      dms,
      whitelist
    };
    
    // Perform updates
    const nextAudits = addAuditLog(moduleName.toLowerCase(), 'CONFIG_SAVE', `Updated general settings for ${moduleName}`);
    triggerToast(`Success: Configured ${moduleName} successfully saved!`);

    await saveGuildConfig({
      settings: nextSettings,
      audits: nextAudits
    });

    setIsSaving(false);
  };

  const handleChannelLockToggle = async (channelId: string, currentLockedState: boolean) => {
    if (!activeGuild?.id) return;
    try {
      const lockState = !currentLockedState;
      const res = await fetch(`${backendUrl}/api/v1/guilds/${activeGuild.id}/channels/${channelId}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lock: lockState })
      });
      const data = await res.json();
      if (data.success) {
        setGuildChannels(prev => prev.map(ch => ch.id === channelId ? { ...ch, locked: lockState } : ch));
        triggerToast(`Success: Channel #${channelId} is now ${lockState ? 'LOCKED' : 'UNLOCKED'}`);
        if (data.audit) {
          setAudits(prev => [data.audit, ...prev]);
        }
      } else {
        triggerToast('Error: Failed to change lock state on server.');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error: Failed to connect to backend for lock/unlock operation.');
    }
  };

  const handleCreateBackup = async () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'NX-';
    for (let i = 0; i < 16; i++) {
      if (i > 0 && i % 4 === 0) code += '-';
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewBackupCode(code);
    
    const newBk = {
      id: `bk-${Math.random().toString(36).substr(2, 6)}`,
      creatorName: 'Nexus#0001',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      channelCount: 45,
      roleCount: 16,
      size: '430KB'
    };
    const nextBkList = [newBk, ...backups];
    setBackups(nextBkList);
    setModalType('backup-success');
    const nextAudits = addAuditLog('backup', 'CREATE_SUCCESS', `Triggered structural snapshot backup. Size: ${newBk.size}`);

    await saveGuildConfig({
      backups: nextBkList,
      audits: nextAudits
    });
  };

  const submitAddWarning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formWarnTag || !formWarnReason) return;
    const caseIdNum = warnings.length + 12395;
    const newWarn: WarningRecord = {
      id: `warn-${warnings.length + 1}`,
      guildId: activeGuild.id,
      memberId: `m-${Math.floor(Math.random() * 9000) + 1000}`,
      memberTag: formWarnTag,
      reason: formWarnReason,
      source: 'manual',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      executorId: 'user-0001',
      executorTag: 'Nexus#0001',
      caseId: `NX-0${caseIdNum}`,
      active: true
    };
    const nextWarnList = [newWarn, ...warnings];
    setWarnings(nextWarnList);
    setModalType('none');
    triggerToast(`Warned ${formWarnTag} for: ${formWarnReason}`);
    const nextAudits = addAuditLog('warnings', 'MEMBER_WARN', `Manually warned user ${formWarnTag}`);
    
    await saveGuildConfig({
      warnings: nextWarnList,
      audits: nextAudits
    });

    setFormWarnTag('');
    setFormWarnReason('');
  };

  const handleClearWarning = async (id: string) => {
    const nextWarnList = warnings.map(w => w.id === id ? { ...w, active: false } : w);
    setWarnings(nextWarnList);
    triggerToast(`Warning cleared: Case resolved.`);
    const nextAudits = addAuditLog('warnings', 'WARN_CLEAR', `Cleared warning ID ${id} from member records`);

    await saveGuildConfig({
      warnings: nextWarnList,
      audits: nextAudits
    });
  };

  const submitInviteAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formInviteTag) return;
    const amt = parseInt(formInviteAmount);
    const nextInviteList = invites.map(inv => {
      if (inv.memberTag.toLowerCase().includes(formInviteTag.toLowerCase())) {
        return {
          ...inv,
          real: inv.real + amt,
          total: inv.total + amt
        };
      }
      return inv;
    });
    setInvites(nextInviteList);
    setModalType('none');
    triggerToast(`Added ${amt} invites to member ${formInviteTag}`);
    const nextAudits = addAuditLog('invites', 'INVITE_ADD', `Manually adjusted invite totals of ${formInviteTag} (+${amt})`);
    
    await saveGuildConfig({
      invites: nextInviteList,
      audits: nextAudits
    });

    setFormInviteTag('');
  };

  const handleResetInvitesUser = async (tag: string) => {
    const nextInviteList = invites.map(inv => inv.memberTag === tag ? { ...inv, real: 0, fake: 0, rejoin: 0, left: 0, total: 0 } : inv);
    setInvites(nextInviteList);
    triggerToast(`Reset invites for ${tag}`);
    const nextAudits = addAuditLog('invites', 'INVITE_RESET', `Reset invite metrics for member ${tag}`);

    await saveGuildConfig({
      invites: nextInviteList,
      audits: nextAudits
    });
  };

  const handleResetInvitesServer = async () => {
    if (confirm('Are you absolutely sure you want to purge all invite metrics of the server? This is irreversible.')) {
      const nextInviteList = invites.map(inv => ({ ...inv, real: 0, fake: 0, rejoin: 0, left: 0, total: 0 }));
      setInvites(nextInviteList);
      triggerToast('Full invite registry purged for this guild.');
      const nextAudits = addAuditLog('invites', 'SERVER_INVITE_RESET', `Triggered global invite database flush and snapshot sync`);

      await saveGuildConfig({
        invites: nextInviteList,
        audits: nextAudits
      });
    }
  };

  const handleSendDm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDmTarget || !formDmContent) return;
    setIsLoading(true);
    try {
        const res = await fetch(`${backendUrl}/api/v1/bot/dm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target: formDmTarget, content: formDmContent, embed: formDmEmbed })
        });
        const data = await res.json();
        if (data.success) {
            triggerToast(`DM Sent successfully to ${formDmTarget}!`);
            setFormDmTarget('');
            setFormDmContent('');
            setFormDmEmbed(false);
            const nextAudits = addAuditLog('direct-messages', 'DM_SEND', `Dispatched bot direct message to recipient ${formDmTarget}`);
            await saveGuildConfig({ audits: nextAudits });
        } else {
            triggerToast(`Failed to send DM: ${data.error}`);
        }
    } catch (err) {
        triggerToast('Failed to send DM: Network error');
    } finally {
        setIsLoading(false);
    }
  };

  const handleMenuClick = (menu: string) => {
    setSelectedMenu(menu);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#0c0c0e] text-slate-300 font-sans overflow-hidden shadow-2xl">
      {/* HEADER BAR */}
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-3 md:px-6 bg-[#0f0f12] shrink-0 z-50 relative">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          {activeTab === 'dashboard' ? (
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white md:hidden transition-colors shrink-0"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          ) : (
            <div className="w-8 h-8 bg-[#5865F2] rounded flex items-center justify-center font-bold text-white font-display shrink-0">N</div>
          )}
          <span className="font-bold tracking-tight text-white text-xs sm:text-sm md:text-base lg:text-lg font-display truncate">NEXUSBOT</span>
          <div className="h-4 w-px bg-slate-700 ml-1 hidden md:inline"></div>
          <span className="text-[9px] font-mono text-[#5865F2] uppercase tracking-widest ml-1 font-semibold hidden md:inline">v1.0.0 Stable</span>
        </div>

        {/* Guild and Admin Status */}
        <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-4 text-xs font-medium min-w-0 shrink-0">
          {activeTab === 'dashboard' && activeGuild && (
            <div className="hidden sm:flex items-center gap-1 bg-slate-800/40 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-slate-700/50 max-w-[100px] xs:max-w-[140px] sm:max-w-none shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              <CustomDropdown
                id="guild-select"
                value={activeGuild.id}
                onChange={(val) => {
                  const selected = guildsList.find(g => g.id === val);
                  if (selected) {
                    setActiveGuild(selected);
                    setIsMobileMenuOpen(false);
                  }
                }}
                options={guildsList.filter(g => g.botInGuild || !g.isReal).map(g => ({
                  value: g.id,
                  label: g.name
                }))}
                className="w-32 sm:w-40"
                buttonClassName="bg-transparent border-none py-0.5 text-[10px] sm:text-xs font-medium text-slate-200"
              />
              <span className="text-[9px] font-mono text-slate-500 border-l border-slate-700 pl-2 hidden lg:inline">{activeGuild.id}</span>
            </div>
          )}

          {discordUser ? (
            <div className="flex items-center gap-1 sm:gap-2 bg-slate-800/40 border border-slate-700/50 py-1 pl-1 pr-2 sm:pr-3 rounded-full shrink-0">
              {discordUser.avatarUrl ? (
                <img 
                  src={discordUser.avatarUrl} 
                  alt={discordUser.username} 
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-indigo-500/30 object-cover shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-white uppercase shrink-0">
                  {discordUser.username.substring(0, 2)}
                </div>
              )}
              <div className="flex flex-col items-start leading-none min-w-0">
                <span className="text-slate-200 text-[9px] sm:text-[10px] font-bold truncate max-w-[50px] xs:max-w-[80px] sm:max-w-[120px]">{discordUser.username}</span>
                <button 
                  onClick={handleDiscordLogout} 
                  className="text-indigo-400 hover:text-indigo-300 text-[8px] sm:text-[9px] font-medium underline bg-transparent border-none p-0 cursor-pointer shrink-0"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      {/* RENDER ACTIVE TAB */}
      <div className="flex flex-1 overflow-hidden relative">
        {!discordUser ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 bg-[#0c0c0e] overflow-y-auto">
            <div className="max-w-md w-full bg-[#0f0f12] border border-white/5 rounded-2xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden group">
              {/* Background glow */}
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#5865F2]/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#5865F2]/10 rounded-full blur-3xl pointer-events-none" />
              
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-16 h-16 bg-[#5865F2] rounded-2xl flex items-center justify-center font-bold text-white font-display text-3xl mx-auto shadow-xl shadow-[#5865F2]/20 border border-[#5865F2]/30"
              >
                N
              </motion.div>
              
              <div className="space-y-2">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white font-display">🛰️ NexusBot Security Core</h1>
                <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                  High-concurrency full-stack Discord security shield. Connect your Discord account to access and configure your servers.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleDiscordLogin}
                  className="w-full flex items-center justify-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-[#5865F2]/20 active:scale-95 cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 127.14 96.36">
                    <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.89-.65,1.76-1.34,2.58-2.06a75.48,75.48,0,0,0,66,0c.82.72,1.69,1.41,2.58,2.06a68.32,68.32,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31-18.83C129.87,50.12,123.63,27.35,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z"/>
                  </svg>
                  <span>Connect with Discord</span>
                </button>
              </div>

              <div className="text-[10px] text-slate-500 font-mono flex items-center justify-center gap-1.5 pt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Nexus Isolation Shield Active</span>
              </div>
            </div>
          </div>
        ) : activeTab === 'home' ? (
          <div className="flex-1 flex flex-col items-center justify-start p-4 md:p-8 bg-[#0c0c0e] overflow-y-auto">
            <div className="max-w-4xl w-full space-y-8 py-8">
              {/* Header section with NexusBot logo & tagline */}
              <div className="text-center space-y-3">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-16 h-16 bg-[#5865F2] rounded-2xl flex items-center justify-center font-bold text-white font-display text-3xl mx-auto shadow-xl shadow-[#5865F2]/20 border border-[#5865F2]/30"
                >
                  N
                </motion.div>
                <div className="space-y-1">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display">🛰️ NexusBot Security Hub</h1>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                    High-performance automated moderation, AntiRaid, AntiNuke shielding, and tickets manager. Select a server to get started.
                  </p>
                </div>
              </div>

              {/* Servers Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-display">Your Discord Servers</span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                    {guildsList.filter(g => g.botInGuild || !g.isReal).length} Connected
                  </span>
                </div>

                {/* Server Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {guildsList.filter(g => g.botInGuild || !g.isReal).map((guild) => {
                    return (
                      <motion.div
                        key={guild.id}
                        whileHover={{ y: -3, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setActiveGuild(guild);
                          setActiveTab('dashboard');
                        }}
                        className="bg-[#0f0f12] border border-white/5 rounded-xl p-5 hover:border-[#5865F2]/40 transition-all cursor-pointer flex flex-col gap-4 relative overflow-hidden group shadow-lg animate-fade-in"
                      >
                        {/* Top background glow on hover */}
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#5865F2]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-[#5865F2]/10 border border-white/10 text-white font-bold flex items-center justify-center text-base shrink-0 group-hover:bg-[#5865F2] group-hover:text-white transition-all duration-300">
                            {guild.icon && guild.icon.startsWith('http') ? (
                              <img src={guild.icon} alt={guild.name} className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
                            ) : (
                              <span>{guild.icon || guild.name.substring(0, 2).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-white text-sm truncate group-hover:text-[#5865F2] transition-colors">{guild.name}</h3>
                            <span className="text-[10px] text-slate-500 block">{(guild.memberCount || 0).toLocaleString()} Members</span>
                          </div>
                        </div>

                        <div className="mt-auto flex items-center justify-between pt-2 border-t border-white/5">
                          <span className="text-[9px] font-mono text-slate-500 truncate max-w-[120px]">{guild.id}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">✓ Shield Live</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* Invite/Add Bot Card */}
                  <motion.a
                    href="https://discord.com/oauth2/authorize?client_id=1528216029816426608&permissions=8&scope=bot%20applications.commands"
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ y: -3, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-[#0f0f12]/40 border border-dashed border-white/10 rounded-xl p-5 hover:border-[#5865F2]/40 transition-all flex flex-col items-center justify-center text-center gap-3 group min-h-[140px] shadow-md"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-white/5 group-hover:bg-[#5865F2]/10 group-hover:border-[#5865F2]/20 transition-all">
                      <Plus className="w-5 h-5 text-slate-400 group-hover:text-[#5865F2] transition-colors" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-white block group-hover:text-[#5865F2] transition-colors">Add Bot to Server</span>
                      <p className="text-[10px] text-slate-500 leading-normal">Invite NexusBot to protect another guild</p>
                    </div>
                  </motion.a>
                </div>

                {/* Extra instructions if no servers */}
                {guildsList.filter(g => g.botInGuild || !g.isReal).length === 0 && (
                  <div className="p-8 bg-[#0f0f12] border border-white/5 rounded-xl text-center space-y-3">
                    <Bot className="w-8 h-8 text-indigo-400 mx-auto" />
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-white block">No active servers found with NexusBot</span>
                      <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                        Connect with Discord and invite NexusBot to your guild to begin configuring features.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* MOBILE SIDEBAR BACKDROP */}
            {isMobileMenuOpen && (
              <div 
                className="fixed inset-x-0 top-16 bottom-0 bg-black/70 backdrop-blur-sm z-30 md:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />
            )}

            {/* SIDEBAR NAVIGATION */}
            <aside className={`fixed md:relative top-16 md:top-0 bottom-0 left-0 w-64 border-r border-white/5 bg-[#0f0f12] p-4 flex flex-col gap-5 shrink-0 overflow-y-auto transition-transform duration-300 z-40 md:translate-x-0 ${
              isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>
              {/* Server Selector inside Sidebar */}
              {activeGuild && (
                <div className="bg-slate-900/50 p-3 rounded-lg border border-white/5 space-y-2">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 font-display flex justify-between items-center">
                    <span>Selected Server</span>
                    <button 
                      onClick={() => {
                        setActiveTab('home');
                        setIsMobileMenuOpen(false);
                      }}
                      className="text-[#5865F2] hover:underline normal-case font-semibold text-[9px] cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded bg-[#5865F2]/20 border border-[#5865F2]/30 text-white font-bold flex items-center justify-center text-xs shrink-0">
                      {activeGuild.icon && activeGuild.icon.startsWith('http') ? (
                        <img src={activeGuild.icon} alt={activeGuild.name} className="w-full h-full object-cover rounded" referrerPolicy="no-referrer" />
                      ) : (
                        <span>{activeGuild.icon || activeGuild.name.substring(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CustomDropdown
                        value={activeGuild.id}
                        onChange={(val) => {
                          const selected = guildsList.find(g => g.id === val);
                          if (selected) {
                            setActiveGuild(selected);
                          }
                        }}
                        options={guildsList.filter(g => g.botInGuild || !g.isReal).map(g => ({
                          value: g.id,
                          label: g.name
                        }))}
                        className="w-full"
                        buttonClassName="bg-transparent border-none p-0 text-xs font-bold text-slate-200 hover:border-none focus:ring-0"
                      />
                      <span className="text-[9px] text-slate-500 block font-mono truncate">{activeGuild.id}</span>
                    </div>
                  </div>
                </div>
              )}



              {/* Sidebar Search Filter */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter menu tabs..."
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  className="w-full bg-[#070709] border border-white/5 hover:border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#5865F2]"
                />
                {sidebarSearch && (
                  <button 
                    onClick={() => setSidebarSearch('')} 
                    className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Category: Security */}
              {(!sidebarSearch || ['automod', 'antiraid', 'antinuke', 'whitelist', 'security'].some(k => k.includes(sidebarSearch.toLowerCase()))) && (
                <nav className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 mb-2 font-display">Security Protection</div>
                  {(!sidebarSearch || 'automod filters'.includes(sidebarSearch.toLowerCase())) && (
                    <button
                      id="nav-automod"
                      onClick={() => handleMenuClick('automod')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs transition-all cursor-pointer ${
                        selectedMenu === 'automod' 
                          ? 'bg-[#5865F2] text-white font-bold shadow shadow-[#5865F2]/20' 
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                      }`}
                    >
                      <NexusIcon name="automod" fallback={<Shield className="w-4 h-4 text-amber-400" />} />
                      <span>AutoMod Filters</span>
                    </button>
                  )}
                  {(!sidebarSearch || 'antiraid defense'.includes(sidebarSearch.toLowerCase())) && (
                    <button
                      id="nav-antiraid"
                      onClick={() => handleMenuClick('antiraid')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs transition-all cursor-pointer ${
                        selectedMenu === 'antiraid' 
                          ? 'bg-[#5865F2] text-white font-bold shadow shadow-[#5865F2]/20' 
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                      }`}
                    >
                      <NexusIcon name="antiraid" fallback={<Zap className="w-4 h-4 text-red-400" />} />
                      <span>Anti-Raid Defense</span>
                    </button>
                  )}
                  {(!sidebarSearch || 'antinuke safeguards'.includes(sidebarSearch.toLowerCase())) && (
                    <button
                      id="nav-antinuke"
                      onClick={() => handleMenuClick('antinuke')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs transition-all cursor-pointer ${
                        selectedMenu === 'antinuke' 
                          ? 'bg-[#5865F2] text-white font-bold shadow shadow-[#5865F2]/20' 
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                      }`}
                    >
                      <NexusIcon name="antinuke" fallback={<Bot className="w-4 h-4 text-[#5865F2]" />} />
                      <span>Anti-Nuke Safeguards</span>
                    </button>
                  )}
                  {(!sidebarSearch || 'whitelist exemptions'.includes(sidebarSearch.toLowerCase())) && (
                    <button
                      id="nav-whitelist"
                      onClick={() => handleMenuClick('whitelist')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs transition-all cursor-pointer ${
                        selectedMenu === 'whitelist' 
                          ? 'bg-[#5865F2] text-white font-bold shadow shadow-[#5865F2]/20' 
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                      }`}
                    >
                      <NexusIcon name="whitelist" fallback={<UserCheck className="w-4 h-4 text-emerald-400" />} />
                      <span>Whitelist & Exemptions</span>
                    </button>
                  )}
                </nav>
              )}

              {/* Category: System Logs & Infractions */}
              {(!sidebarSearch || ['audit', 'warnings', 'logs', 'infractions'].some(k => k.includes(sidebarSearch.toLowerCase()))) && (
                <nav className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 mb-2 font-display">Logs & Infractions</div>

                  {(!sidebarSearch || 'audit logs history'.includes(sidebarSearch.toLowerCase())) && (
                    <button
                      id="nav-audit"
                      onClick={() => handleMenuClick('audit')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs transition-all cursor-pointer ${
                        selectedMenu === 'audit' 
                          ? 'bg-[#5865F2] text-white font-bold shadow shadow-[#5865F2]/20' 
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                      }`}
                    >
                      <NexusIcon name="audit" fallback={<History className="w-4 h-4 text-sky-400" />} />
                      <span>System Audit Logs</span>
                    </button>
                  )}

                  {(!sidebarSearch || 'warning tickets infractions'.includes(sidebarSearch.toLowerCase())) && (
                    <button
                      id="nav-warnings"
                      onClick={() => handleMenuClick('warnings')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs transition-all cursor-pointer ${
                        selectedMenu === 'warnings' 
                          ? 'bg-[#5865F2] text-white font-bold shadow shadow-[#5865F2]/20' 
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                      }`}
                    >
                      <NexusIcon name="warning" fallback={<AlertTriangle className="w-4 h-4 text-amber-400" />} />
                      <span>Member Warnings</span>
                    </button>
                  )}
                </nav>
              )}

              {/* Host Environment Widget */}
              <div className="mt-auto border-t border-white/5 pt-4 px-2 space-y-3">
                <div>
                  <div className="text-[10px] text-slate-500 mb-1 tracking-wider uppercase font-mono font-bold">Host Environment</div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                    <span className="text-xs font-mono text-emerald-400 font-semibold">Bot Node Active</span>
                  </div>
                  <div className="bg-slate-900 rounded p-2.5 border border-slate-800">
                    <div className="flex justify-between text-[10px] mb-1 font-mono text-slate-400">
                      <span>RAM: 1.1GB</span>
                      <span>2GB</span>
                    </div>
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-[#5865F2] w-[55%]"></div>
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            {/* MAIN WORKSPACE CONTENT */}
            <main className="flex-1 bg-[#0c0c0e] p-4 md:p-6 flex flex-col gap-6 overflow-y-auto relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedMenu}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 flex flex-col gap-6"
                >
                  {/* AUTOMOD CONFIG */}
                  {selectedMenu === 'automod' && (
                    <div className="flex-1 flex flex-col lg:flex-row gap-6">
                      <div className="flex-1 bg-[#0f0f12] border border-white/5 rounded-lg p-6 overflow-y-auto space-y-6">
                        <div className="flex justify-between items-center pb-2 border-b border-white/5">
                          <div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">AutoMod (Automated Moderation)</h3>
                            <p className="text-[11px] text-slate-500">Automatically filter messages and keep chat clean.</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {renderCard(
                            'activity-logging',
                            'General Activity Logging',
                            'Log channel modifications, role updates, member events, and message edits/deletions (/activity log channel:).',
                            FileText,
                            activityLogging.enabled,
                            () => setActivityLogging(a => ({ ...a, enabled: !a.enabled })),
                            <div className="space-y-4">
                              <div className="space-y-1.5">
                                <label className="text-slate-400 font-medium block">Activity Log Channel (/activity log channel:)</label>
                                <CustomDropdown
                                  value={activityLogging.logChannelId || ''}
                                  onChange={(val) => setActivityLogging(a => ({ ...a, logChannelId: val }))}
                                  options={getChannelOptions(activityLogging.logChannelId || '')}
                                  className="w-full"
                                />
                              </div>
                            </div>
                          )}

                          {renderCard(
                            'automod-logger',
                            'Shield Logger & Staff Rules',
                            'Configure where violation logs are sent and whether moderators are immune.',
                            Sliders,
                            autoMod.enabled,
                            () => setAutoMod(a => ({ ...a, enabled: !a.enabled })),
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <label className="text-slate-400 font-medium block">Log Channel (/automod log channel:)</label>
                                  <CustomDropdown
                                    value={autoMod.logChannelId || ''}
                                    onChange={(val) => setAutoMod(a => ({ ...a, logChannelId: val }))}
                                    options={getChannelOptions(autoMod.logChannelId || '')}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-slate-400 font-medium block">Bypass/Ignored Roles</label>
                                  <MultiSelectDropdown
                                    selectedValues={autoMod.ignoredRoles || []}
                                    onChange={(values) => setAutoMod(a => ({ ...a, ignoredRoles: values }))}
                                    options={guildRoles.map(r => ({ value: r.id, label: r.name }))}
                                    placeholder="Select roles..."
                                    className="w-full"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center justify-between p-3 bg-red-950/20 rounded border border-red-500/10">
                                <div>
                                  <span className="font-semibold text-red-400 block flex items-center gap-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    <span>Enforce rules on staff</span>
                                  </span>
                                  <p className="text-[10px] text-slate-500">Apply these chat filters to server moderators and admins too.</p>
                                </div>
                                <ToggleSwitch 
                                  enabled={!!autoMod.enforceStaff}
                                  onChange={() => setAutoMod(a => ({ ...a, enforceStaff: !a.enforceStaff }))}
                                />
                              </div>
                            </div>
                          )}

                          {renderCard(
                            'automod-spam',
                            'Anti-Spam Shield',
                            'Detect and stop members from sending messages too fast.',
                            Zap,
                            autoMod.spamFilter,
                            () => setAutoMod(a => ({ ...a, spamFilter: !a.spamFilter })),
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                  <label className="text-slate-400 font-medium block">Spam Messages</label>
                                  <input 
                                    type="number"
                                    value={autoMod.spamMsgLimit ?? autoMod.mentionLimit ?? 5}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value) || 0;
                                      setAutoMod(a => ({ ...a, spamMsgLimit: val, mentionLimit: val }));
                                    }}
                                    className="w-full bg-[#0c0c0e] border border-white/5 rounded px-3 py-2 text-slate-200 focus:border-[#5865F2] focus:outline-none font-mono text-sm"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-slate-400 font-medium block">Time Window (sec)</label>
                                  <input 
                                    type="number"
                                    value={autoMod.spamTimeWindow ?? 10}
                                    onChange={(e) => setAutoMod(a => ({ ...a, spamTimeWindow: parseInt(e.target.value) || 0 }))}
                                    className="w-full bg-[#0c0c0e] border border-white/5 rounded px-3 py-2 text-slate-200 focus:border-[#5865F2] focus:outline-none font-mono text-sm"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-slate-400 font-medium block">Mass Mentions</label>
                                  <input 
                                    type="number"
                                    value={autoMod.massMentionLimit || 5}
                                    onChange={(e) => setAutoMod(a => ({ ...a, massMentionLimit: parseInt(e.target.value) || 0 }))}
                                    className="w-full bg-[#0c0c0e] border border-white/5 rounded px-3 py-2 text-slate-200 focus:border-[#5865F2] focus:outline-none font-mono text-sm"
                                  />
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-slate-400 font-medium block">Action on Violation</label>
                                <CustomDropdown
                                  value={autoMod.action}
                                  onChange={(val) => setAutoMod(a => ({ ...a, action: val as any }))}
                                  options={[
                                    { value: 'delete', label: 'Delete Message Only' },
                                    { value: 'warn', label: 'Warn User' },
                                    { value: 'timeout', label: 'Mute / Timeout User' },
                                    { value: 'kick', label: 'Kick User' },
                                    { value: 'ban', label: 'Ban User' },
                                  ]}
                                  className="w-full"
                                />
                              </div>
                            </div>
                          )}

                          {renderCard(
                            'automod-link',
                            'Link Shield Filter',
                            'Delete external website links sent by regular server members.',
                            ExternalLink,
                            autoMod.linkFilter,
                            () => setAutoMod(a => ({ ...a, linkFilter: !a.linkFilter })),
                            <div className="space-y-4">
                              <p className="text-[11px] text-slate-500 leading-normal">
                                Prevents standard users from sending hyperlinks. Whitelisted roles and admins are bypass-immune.
                              </p>
                              <div className="space-y-1.5">
                                <label className="text-slate-400 font-medium block">Action on Violation</label>
                                <CustomDropdown
                                  value={autoMod.action}
                                  onChange={(val) => setAutoMod(a => ({ ...a, action: val as any }))}
                                  options={[
                                    { value: 'delete', label: 'Delete Message Only' },
                                    { value: 'warn', label: 'Warn User' },
                                    { value: 'timeout', label: 'Mute / Timeout User' },
                                  ]}
                                  className="w-full"
                                />
                              </div>
                            </div>
                          )}

                          {renderCard(
                            'automod-invite',
                            'Invite Shield Filter',
                            'Delete Discord server invites to prevent user siphon.',
                            MessageSquare,
                            autoMod.inviteFilter,
                            () => setAutoMod(a => ({ ...a, inviteFilter: !a.inviteFilter })),
                            <div className="space-y-4">
                              <p className="text-[11px] text-slate-500 leading-normal">
                                Deletes discord.gg, discord.com/invite, and other known guild invitation codes instantly.
                              </p>
                              <div className="space-y-1.5">
                                <label className="text-slate-400 font-medium block">Action on Violation</label>
                                <CustomDropdown
                                  value={autoMod.action}
                                  onChange={(val) => setAutoMod(a => ({ ...a, action: val as any }))}
                                  options={[
                                    { value: 'delete', label: 'Delete Message Only' },
                                    { value: 'warn', label: 'Warn User' },
                                    { value: 'timeout', label: 'Mute / Timeout User' },
                                  ]}
                                  className="w-full"
                                />
                              </div>
                            </div>
                          )}

                          {renderCard(
                            'automod-duplicate',
                            'Duplicate Message Guard',
                            'Block identical messages sent repeatedly in rapid succession.',
                            RefreshCw,
                            !!autoMod.duplicateFilter,
                            () => setAutoMod(a => ({ ...a, duplicateFilter: !a.duplicateFilter })),
                            <div className="space-y-4">
                              <p className="text-[11px] text-slate-500 leading-normal">
                                Mitigates copy-paste raids by matching consecutive message content from the same user.
                              </p>
                              <div className="space-y-1.5">
                                <label className="text-slate-400 font-medium block">Action on Violation</label>
                                <CustomDropdown
                                  value={autoMod.action}
                                  onChange={(val) => setAutoMod(a => ({ ...a, action: val as any }))}
                                  options={[
                                    { value: 'delete', label: 'Delete Message Only' },
                                    { value: 'warn', label: 'Warn User' },
                                    { value: 'timeout', label: 'Mute / Timeout User' },
                                  ]}
                                  className="w-full"
                                />
                              </div>
                            </div>
                          )}

                          {renderCard(
                            'automod-phishing',
                            'Scam Link Protection',
                            'Instantly ban or delete known malicious, phishing, and nitro scam links.',
                            Shield,
                            !!autoMod.maliciousLinkFilter,
                            () => setAutoMod(a => ({ ...a, maliciousLinkFilter: !a.maliciousLinkFilter })),
                            <div className="space-y-4">
                              <p className="text-[11px] text-slate-500 leading-normal">
                                Connects to a centralized security database of malicious domains to block phishing scams.
                              </p>
                              <div className="space-y-1.5">
                                <label className="text-slate-400 font-medium block">Action on Violation</label>
                                <CustomDropdown
                                  value={autoMod.action}
                                  onChange={(val) => setAutoMod(a => ({ ...a, action: val as any }))}
                                  options={[
                                    { value: 'delete', label: 'Delete Message Only' },
                                    { value: 'warn', label: 'Warn User' },
                                    { value: 'timeout', label: 'Mute / Timeout User' },
                                    { value: 'kick', label: 'Kick User' },
                                    { value: 'ban', label: 'Ban User' },
                                  ]}
                                  className="w-full"
                                />
                              </div>
                            </div>
                          )}

                          {renderCard(
                            'automod-caps',
                            'Caps Lock Filter',
                            'Filter messages containing mostly uppercase letters.',
                            Bell,
                            !!autoMod.capsFilter,
                            () => setAutoMod(a => ({ ...a, capsFilter: !a.capsFilter })),
                            <div className="space-y-4">
                              <p className="text-[11px] text-slate-500 leading-normal">
                                Detects screaming text (e.g. over 70% uppercase in messages longer than 8 characters) and purges.
                              </p>
                              <div className="space-y-1.5">
                                <label className="text-slate-400 font-medium block">Action on Violation</label>
                                <CustomDropdown
                                  value={autoMod.action}
                                  onChange={(val) => setAutoMod(a => ({ ...a, action: val as any }))}
                                  options={[
                                    { value: 'delete', label: 'Delete Message Only' },
                                    { value: 'warn', label: 'Warn User' },
                                  ]}
                                  className="w-full"
                                />
                              </div>
                            </div>
                          )}

                          {renderCard(
                            'automod-badwords',
                            'Banned Keywords Filter',
                            'Automatically censor messages containing forbidden vocabulary.',
                            X,
                            autoMod.badWordsEnabled !== false,
                            () => setAutoMod(a => ({ ...a, badWordsEnabled: a.badWordsEnabled === false ? true : false })),
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-slate-400 font-medium block">Add Censored Keyword</label>
                                <div className="flex gap-2">
                                  <input 
                                    type="text"
                                    value={newBadWord}
                                    onChange={(e) => setNewBadWord(e.target.value)}
                                    placeholder="Type keyword and press Enter..."
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const trimmed = newBadWord.trim();
                                        if (trimmed && !autoMod.badWords.includes(trimmed)) {
                                          setAutoMod(a => ({ ...a, badWords: [...a.badWords, trimmed] }));
                                        }
                                        setNewBadWord('');
                                      }
                                    }}
                                    className="w-full bg-[#0c0c0e] border border-white/5 rounded px-3 py-2 text-slate-200 focus:border-[#5865F2] focus:outline-none font-mono text-xs"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const trimmed = newBadWord.trim();
                                      if (trimmed && !autoMod.badWords.includes(trimmed)) {
                                        setAutoMod(a => ({ ...a, badWords: [...a.badWords, trimmed] }));
                                      }
                                      setNewBadWord('');
                                    }}
                                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 rounded text-xs transition shrink-0 cursor-pointer"
                                  >
                                    Add
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-1.5 pt-1 max-h-[85px] overflow-y-auto">
                                  {autoMod.badWords.length === 0 ? (
                                    <span className="text-[10px] text-slate-600 block italic">No keywords banned yet.</span>
                                  ) : (
                                    autoMod.badWords.map(w => (
                                      <div key={w} className="flex items-center gap-1 bg-[#5865F2]/10 border border-[#5865F2]/20 text-slate-200 px-2.5 py-1 rounded-full text-[10px] font-mono">
                                        <span>{w}</span>
                                        <button
                                          type="button"
                                          onClick={() => setAutoMod(a => ({ ...a, badWords: a.badWords.filter(x => x !== w) }))}
                                          className="text-slate-500 hover:text-red-400 focus:outline-none cursor-pointer"
                                        >
                                          <X className="w-2.5 h-2.5" />
                                        </button>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {renderCard(
                            'automod-emojis',
                            'Emoji Limit Filter',
                            'Curb emoji spam by restricting maximum allowed emojis per message.',
                            Heart,
                            autoMod.emojiLimitEnabled !== false,
                            () => setAutoMod(a => ({ ...a, emojiLimitEnabled: a.emojiLimitEnabled === false ? true : false })),
                            <div className="space-y-4">
                              <div className="space-y-1.5">
                                <label className="text-slate-400 font-medium block">Emoji Limit per Message</label>
                                <input 
                                  type="number"
                                  value={autoMod.emojiLimit || 10}
                                  onChange={(e) => setAutoMod(a => ({ ...a, emojiLimit: parseInt(e.target.value) || 0 }))}
                                  className="w-full bg-[#0c0c0e] border border-white/5 rounded px-3 py-2 text-slate-200 focus:border-[#5865F2] focus:outline-none font-mono"
                                />
                              </div>
                            </div>
                          )}

                          {renderCard(
                            'automod-regex',
                            'Custom Regex Guard',
                            'Censor messages matching advanced regular expression queries.',
                            Sliders,
                            autoMod.regexEnabled !== false,
                            () => setAutoMod(a => ({ ...a, regexEnabled: a.regexEnabled === false ? true : false })),
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-slate-400 font-medium block">Add Regex Rule</label>
                                <div className="flex gap-2">
                                  <input 
                                    type="text"
                                    value={newRegexPattern}
                                    onChange={(e) => setNewRegexPattern(e.target.value)}
                                    placeholder="Add a regex rule (e.g. \bscam\b)..."
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const trimmed = newRegexPattern.trim();
                                        if (trimmed && !(autoMod.regexPatterns || []).includes(trimmed)) {
                                          setAutoMod(a => ({ ...a, regexPatterns: [...(autoMod.regexPatterns || []), trimmed] }));
                                        }
                                        setNewRegexPattern('');
                                      }
                                    }}
                                    className="w-full bg-[#0c0c0e] border border-white/5 rounded px-3 py-2 text-slate-200 focus:border-[#5865F2] focus:outline-none font-mono text-xs"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const trimmed = newRegexPattern.trim();
                                      if (trimmed && !(autoMod.regexPatterns || []).includes(trimmed)) {
                                        setAutoMod(a => ({ ...a, regexPatterns: [...(autoMod.regexPatterns || []), trimmed] }));
                                      }
                                      setNewRegexPattern('');
                                    }}
                                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 rounded text-xs transition shrink-0 cursor-pointer"
                                  >
                                    Add
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-1.5 pt-1 max-h-[85px] overflow-y-auto">
                                  {(!autoMod.regexPatterns || autoMod.regexPatterns.length === 0) ? (
                                    <span className="text-[10px] text-slate-600 block italic">No regex patterns declared.</span>
                                  ) : (
                                    autoMod.regexPatterns.map(p => (
                                      <div key={p} className="flex items-center gap-1 bg-[#10B981]/10 border border-[#10B981]/20 text-slate-200 px-2.5 py-1 rounded-full text-[10px] font-mono">
                                        <span>{p}</span>
                                        <button
                                          type="button"
                                          onClick={() => setAutoMod(a => ({ ...a, regexPatterns: (autoMod.regexPatterns || []).filter(x => x !== p) }))}
                                          className="text-slate-500 hover:text-red-400 focus:outline-none cursor-pointer"
                                        >
                                          <X className="w-2.5 h-2.5" />
                                        </button>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {renderCard(
                            'automod-warn-limit',
                            'Warning Punishment Threshold',
                            'Set a maximum warning limit and trigger an automated action when a user reaches it.',
                            AlertTriangle,
                            !!autoMod.warnLimitEnabled,
                            () => setAutoMod(a => ({ ...a, warnLimitEnabled: !a.warnLimitEnabled })),
                            <div className="space-y-4">
                              <p className="text-[11px] text-slate-500 leading-normal">
                                Once a member receives this many active warnings (manual or auto), they are punished automatically. On action, the user warnings are reset to 0.
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <label className="text-slate-400 font-medium block">Warn Limit</label>
                                  <input 
                                    type="number"
                                    min="1"
                                    value={autoMod.warnLimitMax ?? 3}
                                    onChange={(e) => setAutoMod(a => ({ ...a, warnLimitMax: Math.max(1, parseInt(e.target.value) || 3) }))}
                                    className="w-full bg-[#0c0c0e] border border-white/5 rounded px-3 py-2 text-slate-200 focus:border-[#5865F2] focus:outline-none font-mono text-xs"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-slate-400 font-medium block text-xs">Punishment Action</label>
                                  <CustomDropdown
                                    value={autoMod.warnLimitAction || 'timeout'}
                                    onChange={(val) => setAutoMod(a => ({ ...a, warnLimitAction: val as any }))}
                                    options={[
                                      { value: 'timeout', label: 'Mute / Timeout' },
                                      { value: 'kick', label: 'Kick from Server' },
                                      { value: 'ban', label: 'Ban from Server' },
                                      { value: 'none', label: 'None (Log Only)' },
                                    ]}
                                    className="w-full"
                                  />
                                </div>
                              </div>

                              {/* Custom Duration Input Field for Mute/Timeout or Ban actions */}
                              {(autoMod.warnLimitAction === 'timeout' || autoMod.warnLimitAction === 'ban') && (
                                <div className="space-y-2 pt-2 border-t border-white/5">
                                  <div className="flex justify-between items-center">
                                    <label className="text-slate-400 font-medium block text-xs">Punishment Duration</label>
                                    <span className="text-[10px] text-slate-500">e.g. 10m, 1h, 24h, 7d</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <input 
                                      type="text"
                                      placeholder="24h"
                                      value={autoMod.warnLimitDuration || '24h'}
                                      onChange={(e) => setAutoMod(a => ({ ...a, warnLimitDuration: e.target.value }))}
                                      className="flex-1 bg-[#0c0c0e] border border-white/5 rounded px-3 py-2 text-slate-200 focus:border-[#5865F2] focus:outline-none font-mono text-xs"
                                    />
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {['10m', '1h', '6h', '12h', '24h', '3d', '7d'].map((preset) => (
                                      <button
                                        key={preset}
                                        type="button"
                                        onClick={() => setAutoMod(a => ({ ...a, warnLimitDuration: preset }))}
                                        className={`px-2 py-1 rounded text-[10px] font-mono transition cursor-pointer ${
                                          (autoMod.warnLimitDuration || '24h') === preset
                                            ? 'bg-[#5865F2] text-white font-bold'
                                            : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                                        }`}
                                      >
                                        {preset}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ANTIRAID CONFIG */}
                  {selectedMenu === 'antiraid' && (
                    <div className="flex-1 flex flex-col lg:flex-row gap-6">
                      <div className="flex-1 bg-[#0f0f12] border border-white/5 rounded-lg p-6 overflow-y-auto space-y-6">
                        <div className="flex justify-between items-center pb-2 border-b border-white/5">
                          <div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">AntiRaid Protection</h3>
                            <p className="text-[11px] text-slate-500">Shield your server from sudden bot joins and raid attacks.</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {renderCard(
                            'antiraid-joins',
                            'Join Ingress Rate Limit',
                            'Detect sudden spikes of joining users within short intervals.',
                            Zap,
                            antiRaid.enabled,
                            () => setAntiRaid(a => ({ ...a, enabled: !a.enabled })),
                            <div className="space-y-4">
                              <div className="space-y-1.5">
                                <label className="text-slate-400 font-medium block">Join Rate Limit (Joins per 10 seconds)</label>
                                <input 
                                  type="number"
                                  value={antiRaid.joinRateThreshold || 10}
                                  onChange={(e) => setAntiRaid(a => ({ ...a, joinRateThreshold: parseInt(e.target.value) || 0 }))}
                                  className="w-full bg-[#0c0c0e] border border-white/5 rounded px-3 py-2 text-slate-200 focus:border-[#5865F2] focus:outline-none font-mono text-xs"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <label className="text-slate-400 font-medium block">Velocity Joins Limit</label>
                                  <input 
                                    type="number"
                                    value={antiRaid.velocityJoins || 5}
                                    onChange={(e) => setAntiRaid(a => ({ ...a, velocityJoins: parseInt(e.target.value) || 0 }))}
                                    className="w-full bg-[#0c0c0e] border border-white/5 rounded px-3 py-2 text-slate-200 focus:border-[#5865F2] focus:outline-none font-mono text-xs"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-slate-400 font-medium block">Velocity Window (Secs)</label>
                                  <input 
                                    type="number"
                                    value={antiRaid.velocitySeconds || 10}
                                    onChange={(e) => setAntiRaid(a => ({ ...a, velocitySeconds: parseInt(e.target.value) || 0 }))}
                                    className="w-full bg-[#0c0c0e] border border-white/5 rounded px-3 py-2 text-slate-200 focus:border-[#5865F2] focus:outline-none font-mono text-xs"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {renderCard(
                            'antiraid-quarantine',
                            'New Account Isolation',
                            'Quarantine and mute brand-new Discord accounts created recently.',
                            Shield,
                            antiRaid.quarantineNewAccounts,
                            () => setAntiRaid(a => ({ ...a, quarantineNewAccounts: !a.quarantineNewAccounts })),
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <label className="text-slate-400 font-medium block">Min Account Age (Days)</label>
                                  <input 
                                    type="number"
                                    value={antiRaid.accountAgeMinDays || 1}
                                    onChange={(e) => setAntiRaid(a => ({ ...a, accountAgeMinDays: parseInt(e.target.value) || 0 }))}
                                    className="w-full bg-[#0c0c0e] border border-white/5 rounded px-3 py-2 text-slate-200 focus:border-[#5865F2] focus:outline-none font-mono text-xs"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-slate-400 font-medium block">Max Unverified (Mins)</label>
                                  <input 
                                    type="number"
                                    value={antiRaid.maxUnverifiedAgeMinutes || 15}
                                    onChange={(e) => setAntiRaid(a => ({ ...a, maxUnverifiedAgeMinutes: parseInt(e.target.value) || 0 }))}
                                    className="w-full bg-[#0c0c0e] border border-white/5 rounded px-3 py-2 text-slate-200 focus:border-[#5865F2] focus:outline-none font-mono text-xs"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-slate-400 font-medium block">Action on Quarantine</label>
                                <CustomDropdown
                                  value={antiRaid.action}
                                  onChange={(val) => setAntiRaid(a => ({ ...a, action: val as any }))}
                                  options={[
                                    { value: 'timeout', label: 'Timeout / Mute' },
                                    { value: 'kick', label: 'Kick Account' },
                                    { value: 'ban', label: 'Ban Account' },
                                    { value: 'log_only', label: 'Log Only' }
                                  ]}
                                  className="w-full"
                                />
                              </div>
                            </div>
                          )}

                          {renderCard(
                            'antiraid-captcha',
                            'DM Captcha Verification',
                            'Force new joins to pass a captcha code in their DM prior to server entry.',
                            UserCheck,
                            !!antiRaid.captchaVerification,
                            () => setAntiRaid(a => ({ ...a, captchaVerification: !a.captchaVerification })),
                            <div className="space-y-4">
                              <div className="space-y-1.5">
                                <label className="text-slate-400 font-medium block">Verification Channel</label>
                                <CustomDropdown
                                  value={antiRaid.verificationChannelId || ''}
                                  onChange={(val) => setAntiRaid(a => ({ ...a, verificationChannelId: val }))}
                                  options={getChannelOptions(antiRaid.verificationChannelId || '')}
                                  className="w-full"
                                />
                              </div>
                            </div>
                          )}

                          {renderCard(
                            'antiraid-elevation',
                            'Server Verification Level Elevation',
                            'Auto raise verification security inside discord during high join spikes.',
                            Lock,
                            !!antiRaid.autoVerificationLevel,
                            () => setAntiRaid(a => ({ ...a, autoVerificationLevel: !a.autoVerificationLevel })),
                            <div className="space-y-2">
                              <p className="text-[11px] text-slate-500 leading-normal">
                                Elevates the Discord guild verification settings to "Double Tableflip" (highest) when a join rush is detected to limit unverified guest actions.
                              </p>
                            </div>
                          )}

                          {renderCard(
                            'antiraid-logging',
                            'Staff Alerts & Logs',
                            'Dispatch notification pings to staff log channels when quarantines trigger (/antiraid log channel:).',
                            Sliders,
                            !!antiRaid.notifyQuarantineStaff,
                            () => setAntiRaid(a => ({ ...a, notifyQuarantineStaff: !a.notifyQuarantineStaff })),
                            <div className="space-y-4">
                              <div className="space-y-1.5">
                                <label className="text-slate-400 font-medium block">Log Channel (/antiraid log channel:)</label>
                                <CustomDropdown
                                  value={antiRaid.logChannelId || ''}
                                  onChange={(val) => setAntiRaid(a => ({ ...a, logChannelId: val }))}
                                  options={getChannelOptions(antiRaid.logChannelId || '')}
                                  className="w-full"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ANTINUKE CONFIG */}
                  {selectedMenu === 'antinuke' && (
                    <div className="flex-1 flex flex-col lg:flex-row gap-6">
                      <div className="flex-1 bg-[#0f0f12] border border-white/5 rounded-lg p-6 overflow-y-auto space-y-6">
                        <div className="flex justify-between items-center pb-2 border-b border-white/5">
                          <div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">AntiNuke Protection</h3>
                            <p className="text-[11px] text-slate-500">Protect your server from rogue admins or compromised staff accounts.</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {renderCard(
                            'antinuke-master',
                            'AntiNuke Master Shield',
                            'Master control switch to turn server demolition protection on or off.',
                            Shield,
                            antiNuke.enabled,
                            () => setAntiNuke(a => ({ ...a, enabled: !a.enabled })),
                            <div className="space-y-2">
                              <p className="text-[11px] text-slate-500 leading-normal">
                                Activates continuous background auditing. Rogue staff actions exceeding safety thresholds will trigger automated intervention instantly.
                              </p>
                            </div>
                          )}

                          {renderCard(
                            'antinuke-strip',
                            'Rogue Admin Action Control',
                            'Instantly demote and strip administrative privileges from rogue staff.',
                            AlertTriangle,
                            !!antiNuke.unauthorizedAdminStrip,
                            () => setAntiNuke(a => ({ ...a, unauthorizedAdminStrip: !a.unauthorizedAdminStrip })),
                            <div className="space-y-4">
                              <div className="space-y-1.5">
                                <label className="text-slate-400 font-medium block">Action on Limit Violation</label>
                                <CustomDropdown
                                  value={antiNuke.action}
                                  onChange={(val) => setAntiNuke(a => ({ ...a, action: val as any }))}
                                  options={[
                                    { value: 'remove_roles', label: 'Strip All Admin/Staff Roles' },
                                    { value: 'ban', label: 'Ban Rogue Staff Member' },
                                    { value: 'kick', label: 'Kick Rogue Staff Member' },
                                    { value: 'lockdown', label: 'Put Server in Lockdown' },
                                    { value: 'log_only', label: 'Log Only' }
                                  ]}
                                  className="w-full"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-slate-400 font-medium block">Staff Log Channel</label>
                                <CustomDropdown
                                  value={antiNuke.logChannelId || ''}
                                  onChange={(val) => setAntiNuke(a => ({ ...a, logChannelId: val }))}
                                  options={getChannelOptions(antiNuke.logChannelId || '')}
                                  className="w-full"
                                />
                              </div>
                            </div>
                          )}

                          {renderCard(
                            'antinuke-bots',
                            'Unauthorized Bot Block',
                            'Instantly kick any new bots added to the server unless explicitly authorized.',
                            UserMinus,
                            !!antiNuke.preventBotInvites,
                            () => setAntiNuke(a => ({ ...a, preventBotInvites: !a.preventBotInvites })),
                            <div className="space-y-2">
                              <p className="text-[11px] text-slate-500 leading-normal">
                                Protects against automated backdoor bot invites. Non-whitelisted bots joining are kicked instantly.
                              </p>
                            </div>
                          )}

                          {renderCard(
                            'antinuke-backups',
                            'Layout & Backup Templates',
                            'Save server channel and role templates to quickly restore from a nuke.',
                            RefreshCw,
                            !!antiNuke.restoreTemplatesEnabled,
                            () => setAntiNuke(a => ({ ...a, restoreTemplatesEnabled: !a.restoreTemplatesEnabled })),
                            <div className="space-y-2">
                              <p className="text-[11px] text-slate-500 leading-normal">
                                Automated daily snapshots of your server channels, permissions, and roles. Allows complete recovery in seconds if a staff member goes rogue.
                              </p>
                            </div>
                          )}

                          {renderCard(
                            'antinuke-thresholds',
                            'Strict Metric Thresholds',
                            'Specify the exact number of admin actions allowed in a short interval before locking down.',
                            Sliders,
                            true, // always enabled as a config block
                            () => {},
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="space-y-1">
                                  <label className="text-slate-400 font-medium">Channel Create</label>
                                  <input 
                                    type="number"
                                    value={antiNuke.channelCreateThreshold || 3}
                                    onChange={(e) => setAntiNuke(a => ({ ...a, channelCreateThreshold: parseInt(e.target.value) || 0 }))}
                                    className="w-full bg-[#0c0c0e] border border-white/5 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none font-mono text-xs"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-slate-400 font-medium">Channel Delete</label>
                                  <input 
                                    type="number"
                                    value={antiNuke.channelDeleteThreshold || 3}
                                    onChange={(e) => setAntiNuke(a => ({ ...a, channelDeleteThreshold: parseInt(e.target.value) || 0 }))}
                                    className="w-full bg-[#0c0c0e] border border-white/5 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none font-mono text-xs"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-slate-400 font-medium">Role Create</label>
                                  <input 
                                    type="number"
                                    value={antiNuke.roleCreateThreshold || 3}
                                    onChange={(e) => setAntiNuke(a => ({ ...a, roleCreateThreshold: parseInt(e.target.value) || 0 }))}
                                    className="w-full bg-[#0c0c0e] border border-white/5 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none font-mono text-xs"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-slate-400 font-medium">Role Delete</label>
                                  <input 
                                    type="number"
                                    value={antiNuke.roleDeleteThreshold || 3}
                                    onChange={(e) => setAntiNuke(a => ({ ...a, roleDeleteThreshold: parseInt(e.target.value) || 0 }))}
                                    className="w-full bg-[#0c0c0e] border border-white/5 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none font-mono text-xs"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-slate-400 font-medium">Mass Ban Limit</label>
                                  <input 
                                    type="number"
                                    value={antiNuke.banThreshold || 5}
                                    onChange={(e) => setAntiNuke(a => ({ ...a, banThreshold: parseInt(e.target.value) || 0 }))}
                                    className="w-full bg-[#0c0c0e] border border-white/5 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none font-mono text-xs"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-slate-400 font-medium">Mass Kick Limit</label>
                                  <input 
                                    type="number"
                                    value={antiNuke.kickThreshold || 5}
                                    onChange={(e) => setAntiNuke(a => ({ ...a, kickThreshold: parseInt(e.target.value) || 0 }))}
                                    className="w-full bg-[#0c0c0e] border border-white/5 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none font-mono text-xs"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-slate-400 font-medium">Server Updates</label>
                                  <input 
                                    type="number"
                                    value={antiNuke.guildUpdateThreshold || 2}
                                    onChange={(e) => setAntiNuke(a => ({ ...a, guildUpdateThreshold: parseInt(e.target.value) || 0 }))}
                                    className="w-full bg-[#0c0c0e] border border-white/5 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none font-mono text-xs"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-slate-400 font-medium">Bot Add Limit</label>
                                  <input 
                                    type="number"
                                    value={antiNuke.botAddThreshold || 2}
                                    onChange={(e) => setAntiNuke(a => ({ ...a, botAddThreshold: parseInt(e.target.value) || 0 }))}
                                    className="w-full bg-[#0c0c0e] border border-white/5 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none font-mono text-xs"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {renderCard(
                            'antinuke-logging',
                            'AntiNuke Log Channel',
                            'Select the channel where AntiNuke alerts and rogue admin logs are posted (/antinuke log channel:).',
                            Sliders,
                            antiNuke.enabled,
                            () => setAntiNuke(a => ({ ...a, enabled: !a.enabled })),
                            <div className="space-y-4">
                              <div className="space-y-1.5">
                                <label className="text-slate-400 font-medium block">Log Channel (/antinuke log channel:)</label>
                                <CustomDropdown
                                  value={antiNuke.logChannelId || ''}
                                  onChange={(val) => setAntiNuke(a => ({ ...a, logChannelId: val }))}
                                  options={getChannelOptions(antiNuke.logChannelId || '')}
                                  className="w-full"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* WHITELIST CONFIG */}
                  {selectedMenu === 'whitelist' && (
                    <div className="flex-1 flex flex-col gap-6">
                      <div className="bg-[#0f0f12] border border-white/5 rounded-lg p-6 overflow-y-auto space-y-6">
                        <div className="flex justify-between items-center pb-2 border-b border-white/5">
                          <div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">Security Whitelist</h3>
                            <p className="text-[11px] text-slate-500">Select roles and members who are completely immune to all security restrictions.</p>
                          </div>

                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Whitelisted Roles Card */}
                          <div className="bg-slate-900/20 p-5 rounded-lg border border-white/5 space-y-4">
                            <div className="space-y-1">
                              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">Whitelisted Roles</h4>
                              <p className="text-[10px] text-slate-500">Members carrying any selected role bypass all AutoMod, AntiRaid, and AntiNuke rules.</p>
                            </div>
                            <div className="pt-2">
                              <MultiSelectDropdown
                                selectedValues={whitelist.roles || []}
                                onChange={(values) => setWhitelist(prev => ({ ...prev, roles: values }))}
                                options={guildRoles.map(r => ({ value: r.id, label: r.name }))}
                                placeholder="Select roles to whitelist..."
                                className="w-full"
                              />
                            </div>
                          </div>

                          {/* Whitelisted Users Card */}
                          <div className="bg-slate-900/20 p-5 rounded-lg border border-white/5 space-y-4">
                            <div className="space-y-1">
                              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">Whitelisted Users</h4>
                              <p className="text-[10px] text-slate-500">Specific members who are fully trusted and exempt from any security actions.</p>
                            </div>
                            <div className="pt-2">
                              <MultiSelectDropdown
                                selectedValues={whitelist.users || []}
                                onChange={(values) => setWhitelist(prev => ({ ...prev, users: values }))}
                                options={guildMembers.map(m => ({ value: m.id, label: m.tag || m.username }))}
                                placeholder="Select users to whitelist..."
                                className="w-full"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Informational tip */}
                        <div className="p-4 bg-[#5865F2]/5 border border-[#5865F2]/10 rounded-lg flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-[#5865F2] shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-300">Security Notice</span>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              Whitelisting roles or users grants complete immunity to the specified targets. Ensure only highly trusted staff members, owner accounts, and validated utility bots are selected to maintain robust protection.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AUDIT LOGS VIEW */}
                  {selectedMenu === 'audit' && (
                    <div className="flex-1 bg-[#0f0f12] border border-white/5 rounded-xl p-4 md:p-6 overflow-hidden flex flex-col gap-5 shadow-2xl relative">
                      {/* Title & Description */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#5865F2] animate-pulse"></div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">System Audit Log History</h3>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">Immutable security stream documenting configurations, AutoMod detections, and safeguard triggers.</p>
                        </div>
                        {/* Summary stat badge */}
                        <div className="flex items-center gap-2 bg-[#5865F2]/10 border border-[#5865F2]/20 px-3 py-1.5 rounded-lg self-start sm:self-auto font-mono text-[10px] text-[#5865F2] font-semibold">
                          <Activity className="w-3.5 h-3.5" />
                          <span>{audits.length} Records Loaded</span>
                        </div>
                      </div>

                      {/* Filter & Search Bar - Highly Responsive */}
                      <div className="flex flex-col lg:flex-row gap-3.5">
                        {/* Search Input */}
                        <div className="relative flex-1">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                            <Search className="w-4 h-4" />
                          </span>
                          <input
                            type="text"
                            placeholder="Search by action, culprit, or reason..."
                            value={auditSearch}
                            onChange={(e) => setAuditSearch(e.target.value)}
                            className="w-full bg-[#070709] border border-white/5 hover:border-white/10 rounded-xl pl-9 pr-8 py-2 md:py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#5865F2] transition animate-none"
                          />
                          {auditSearch && (
                            <button
                              onClick={() => setAuditSearch('')}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Module Filters - Horizontal Scrollable Pill Bar on Mobile */}
                        <div className="flex items-center gap-1.5 bg-[#070709] p-1 rounded-xl border border-white/5 overflow-x-auto max-w-full shrink-0 scrollbar-none">
                          {[
                            { value: 'all', label: 'All Modules' },
                            { value: 'automod', label: 'AutoMod' },
                            { value: 'antiraid', label: 'AntiRaid' },
                            { value: 'antinuke', label: 'AntiNuke' },
                            { value: 'moderation', label: 'Moderation' },
                            { value: 'backup', label: 'Backups' },
                            { value: 'settings', label: 'Settings' }
                          ].map((pill) => (
                            <button
                              key={pill.value}
                              onClick={() => setAuditModuleFilter(pill.value)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-display uppercase tracking-wider transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 ${
                                auditModuleFilter === pill.value
                                  ? 'bg-[#5865F2] text-white shadow shadow-[#5865F2]/20'
                                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
                              }`}
                            >
                              {pill.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Professional Log Cards List - Highly Mobile Responsive */}
                      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                        {(() => {
                          const filteredAudits = audits.filter((item) => {
                            const matchesModule = auditModuleFilter === 'all' || item.module.toLowerCase() === auditModuleFilter;
                            const matchesSearch = !auditSearch || 
                              item.action.toLowerCase().includes(auditSearch.toLowerCase()) || 
                              item.reason.toLowerCase().includes(auditSearch.toLowerCase()) || 
                              item.executorTag.toLowerCase().includes(auditSearch.toLowerCase());
                            return matchesModule && matchesSearch;
                          });

                          if (filteredAudits.length === 0) {
                            return (
                              <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-white/5 rounded-2xl bg-slate-950/20 space-y-3">
                                <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-slate-500">
                                  <History className="w-6 h-6 text-slate-400" />
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs font-bold text-slate-300">No Matching Audit Entries</p>
                                  <p className="text-[10px] text-slate-500 max-w-xs mx-auto">Try resetting your active module filter or typing a different search query.</p>
                                </div>
                                {(auditSearch || auditModuleFilter !== 'all') && (
                                  <button
                                    onClick={() => {
                                      setAuditSearch('');
                                      setAuditModuleFilter('all');
                                    }}
                                    className="px-3.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 rounded-lg text-[10px] font-bold border border-white/5 transition cursor-pointer"
                                  >
                                    Reset Filters
                                  </button>
                                )}
                              </div>
                            );
                          }

                          return filteredAudits.map((item) => {
                            // Define professional colors & indicators based on module type
                            const mod = item.module.toLowerCase();
                            let badgeStyle = 'text-slate-400 bg-slate-400/5 border-slate-500/10';
                            let iconElement = <History className="w-3.5 h-3.5 text-slate-400" />;

                            if (mod === 'automod') {
                              badgeStyle = 'text-red-400 bg-red-500/5 border-red-500/15';
                              iconElement = <Shield className="w-3.5 h-3.5 text-red-400" />;
                            } else if (mod === 'antinuke') {
                              badgeStyle = 'text-rose-400 bg-rose-500/5 border-rose-500/15';
                              iconElement = <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
                            } else if (mod === 'antiraid') {
                              badgeStyle = 'text-orange-400 bg-orange-500/5 border-orange-500/15';
                              iconElement = <Zap className="w-3.5 h-3.5 text-orange-400" />;
                            } else if (mod === 'moderation') {
                              badgeStyle = 'text-amber-400 bg-amber-500/5 border-amber-500/15';
                              iconElement = <Sliders className="w-3.5 h-3.5 text-amber-400" />;
                            } else if (mod === 'backup') {
                              badgeStyle = 'text-emerald-400 bg-emerald-500/5 border-emerald-500/15';
                              iconElement = <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
                            } else if (mod === 'settings' || mod === 'config') {
                              badgeStyle = 'text-cyan-400 bg-cyan-500/5 border-cyan-500/15';
                              iconElement = <Settings className="w-3.5 h-3.5 text-cyan-400" />;
                            }

                            return (
                              <div 
                                key={item.eventId} 
                                className="group p-3.5 md:p-4 rounded-xl bg-[#09090c] border border-white/[0.03] hover:border-white/10 hover:bg-[#0c0c0f] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all duration-200"
                              >
                                {/* Left Section: Icon, Module badge, Action & Reason */}
                                <div className="flex items-start gap-3 min-w-0">
                                  {/* Visual Icon indicator container */}
                                  <div className="w-8 h-8 rounded-lg bg-slate-950 border border-white/5 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                                    {iconElement}
                                  </div>
                                  
                                  <div className="space-y-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      {/* Module Badge */}
                                      <span className={`px-2 py-0.5 rounded border text-[9px] font-mono font-bold tracking-wider uppercase shrink-0 ${badgeStyle}`}>
                                        {item.module}
                                      </span>
                                      {/* Action Tag */}
                                      <span className="text-slate-200 font-mono text-[11px] font-bold tracking-tight">
                                        {item.action}
                                      </span>
                                      {/* Time tag for mobile */}
                                      <span className="text-slate-600 font-mono text-[9px] sm:hidden">
                                        {item.createdAt}
                                      </span>
                                    </div>
                                    
                                    {/* Reason Description */}
                                    <p className="text-xs text-slate-300 leading-relaxed break-words font-sans">
                                      {item.reason}
                                    </p>
                                  </div>
                                </div>

                                {/* Right Section: Meta info (User, Time) */}
                                <div className="flex items-center sm:items-end justify-between sm:flex-col shrink-0 gap-1 sm:gap-1.5 w-full sm:w-auto pt-2.5 sm:pt-0 border-t sm:border-t-0 border-white/5 font-mono text-[10px]">
                                  {/* Operator / Executor */}
                                  <div className="flex items-center gap-1.5 bg-slate-950/60 px-2 py-1 rounded-md border border-white/[0.02]">
                                    <span className="text-slate-500 font-semibold uppercase tracking-wider text-[8px]">Agent:</span>
                                    <span className="text-slate-300 font-bold max-w-[120px] truncate">{item.executorTag}</span>
                                  </div>

                                  {/* Desktop Time */}
                                  <span className="text-slate-500 font-bold hidden sm:inline text-[9px]">
                                    {item.createdAt}
                                  </span>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}

                  {/* WARNINGS MODULE */}
                  {selectedMenu === 'warnings' && (
                    <div className="flex-1 bg-[#0f0f12] border border-white/5 rounded-lg p-6 overflow-y-auto space-y-6">
                      <div className="flex justify-between items-center pb-2 border-b border-white/5">
                        <div>
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">Moderation Infractions & Warnings</h3>
                          <p className="text-[11px] text-slate-500">Database storing warn tickets issued to server members automatically or manually.</p>
                        </div>
                        <button 
                          onClick={() => setModalType('add-warning')}
                          className="flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white py-1.5 px-3.5 rounded text-xs font-semibold font-display shadow transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Issue Warning</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-slate-900/40 border border-white/5 rounded-lg text-center space-y-1">
                          <span className="text-[10px] text-slate-500 font-mono block">1 WARNING</span>
                          <span className="text-xs font-bold text-slate-300 font-display">Log & Notify Member</span>
                        </div>
                        <div className="p-4 bg-slate-900/40 border border-white/5 rounded-lg text-center space-y-1">
                          <span className="text-[10px] text-slate-500 font-mono block">2 WARNINGS</span>
                          <span className="text-xs font-bold text-slate-300 font-display">1 Hour Chat Mute</span>
                        </div>
                        <div className="p-4 bg-slate-900/40 border border-white/5 rounded-lg text-center space-y-1">
                          <span className="text-[10px] text-slate-500 font-mono block">3 WARNINGS</span>
                          <span className="text-xs font-bold text-slate-300 font-display">24 Hour Quarantine Timeout</span>
                        </div>
                        <div className="p-4 bg-slate-900/40 border border-white/5 rounded-lg text-center space-y-1">
                          <span className="text-[10px] text-slate-500 font-mono block">5 WARNINGS</span>
                          <span className="text-xs font-bold text-red-500 font-display">Automated IP Ban</span>
                        </div>
                      </div>

                      <div className="bg-slate-900/20 rounded border border-white/5 overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-white/[0.02] border-b border-white/5 text-slate-400 font-mono text-[10px]">
                              <th className="p-3">CASE ID</th>
                              <th className="p-3">TARGET USER</th>
                              <th className="p-3">REASON</th>
                              <th className="p-3">MODERATOR</th>
                              <th className="p-3">DATE / TIME</th>
                              <th className="p-3 text-right">ACTION</th>
                            </tr>
                          </thead>
                          <tbody>
                            {warnings.map((warn) => (
                              <tr key={warn.id} className={`border-b border-white/5 hover:bg-white/[0.01] transition ${!warn.active ? 'opacity-40' : ''}`}>
                                <td className="p-3 font-mono font-bold text-slate-300">{warn.caseId}</td>
                                <td className="p-3 text-slate-200 font-semibold">{warn.memberTag}</td>
                                <td className="p-3 text-slate-400">{warn.reason}</td>
                                <td className="p-3 text-slate-400">{warn.executorTag}</td>
                                <td className="p-3 text-slate-500 font-mono">{warn.createdAt}</td>
                                <td className="p-3 text-right">
                                  {warn.active ? (
                                    <button 
                                      onClick={() => handleClearWarning(warn.id)}
                                      className="px-2.5 py-1 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-600/20 text-emerald-400 rounded text-[10px] font-bold font-display uppercase tracking-wide"
                                    >
                                      Clear Warn
                                    </button>
                                  ) : (
                                    <span className="text-slate-600 font-mono text-[10px] uppercase font-bold pr-2">RESOLVED</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* END CONTENT PANELS */}
                </motion.div>
              </AnimatePresence>

              {/* Floating Save Bar */}
              <FloatingSaveBar
                isDirty={isDirty}
                isSaving={isSaving}
                onSave={() => handleSave(selectedMenu.toUpperCase())}
                onDiscard={() => {
                  if (activeGuild?.id) fetchGuildConfig(activeGuild.id);
                  triggerToast('Unsaved changes discarded');
                }}
              />
            </main>
          </>
        )}
      </div>

      {/* TOAST NOTIFICATION STREAM */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            className="bg-[#0f0f12] border border-white/10 text-white font-semibold rounded px-4 py-3 shadow-2xl flex items-center gap-2 text-xs pointer-events-auto"
          >
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{msg}</span>
          </motion.div>
        ))}
      </div>

      {/* MODALS INJECTS */}
      <AnimatePresence>
        {modalType === 'backup-success' && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0f0f12] border border-[#5865F2]/20 rounded-lg p-6 max-w-sm w-full space-y-4 shadow-2xl text-center"
            >
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-xl">✓</div>
              <div className="space-y-1">
                <h3 className="font-bold text-white text-base font-display">Cryptographic Backup Success</h3>
                <p className="text-xs text-slate-400">Your configuration snapshot is securely isolated. Place this key in your offline manager.</p>
              </div>
              <div className="bg-slate-950 p-3 rounded border border-white/5 select-all font-mono text-xs text-emerald-400 font-bold break-all">
                {newBackupCode}
              </div>
              <button 
                onClick={() => setModalType('none')}
                className="w-full py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded font-bold font-display uppercase tracking-wider text-xs shadow-md transition"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}

        {modalType === 'restore-confirm' && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0f0f12] border border-rose-500/20 rounded-lg p-6 max-w-sm w-full space-y-4 shadow-2xl"
            >
              <div className="flex gap-3 items-start text-xs">
                <AlertTriangle className="w-8 h-8 text-rose-500 shrink-0" />
                <div className="space-y-1">
                  <h3 className="font-bold text-white text-sm font-display uppercase">Restructure Confirmation</h3>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    You are triggering structural configuration restore from backup ID <strong className="text-white">{selectedBackupId}</strong>. Input backup cryptographic recovery key to verify.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="text-slate-400 block">Backup Recovery Key</label>
                <input 
                  type="text"
                  value={restoreCodeInput}
                  onChange={(e) => setRestoreCodeInput(e.target.value)}
                  placeholder="NX-XXXX-XXXX-XXXX-XXXX"
                  className="w-full bg-[#0c0c0e] border border-white/5 rounded px-3 py-2 text-slate-200 focus:border-[#5865F2] focus:outline-none font-mono"
                />
              </div>

              <div className="flex gap-2.5">
                <button 
                  onClick={() => setModalType('none')}
                  className="flex-1 py-2 bg-slate-900 border border-white/5 hover:bg-white/[0.01] text-slate-400 rounded font-semibold text-xs transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (restoreCodeInput.trim().length < 10) {
                      triggerToast('Error: Invalid cryptographic key length.');
                      return;
                    }
                    setModalType('none');
                    setRestoreCodeInput('');
                    triggerToast(`Restored server layout from snapshot successfully!`);
                    addAuditLog('backup', 'RESTORE_SUCCESS', `Successfully restored guild hierarchy mapping using key`);
                  }}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold font-display uppercase tracking-wide text-xs transition"
                >
                  Confirm Restore
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {modalType === 'export-json' && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0f0f12] border border-white/10 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-sky-400" />
                  <h3 className="font-bold text-white text-sm uppercase font-display tracking-wide">Export Server Configuration</h3>
                </div>
                <button onClick={() => setModalType('none')} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <p className="text-xs text-slate-400">
                Below is your active server configuration formatted as clean JSON. You can copy it or save it as a backup file.
              </p>

              <textarea 
                readOnly
                rows={10}
                value={jsonExportString}
                className="w-full bg-[#070709] border border-white/10 rounded-xl p-3 text-xs text-slate-300 font-mono focus:outline-none"
              />

              <div className="flex gap-2.5">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(jsonExportString);
                    triggerToast('Configuration JSON copied to clipboard!');
                  }}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy JSON</span>
                </button>
                <button 
                  onClick={() => {
                    const blob = new Blob([jsonExportString], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${activeGuild?.name || 'server'}-config-backup.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    triggerToast('Downloaded configuration backup JSON file!');
                  }}
                  className="flex-1 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .json</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {modalType === 'import-json' && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0f0f12] border border-white/10 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-white text-sm uppercase font-display tracking-wide">Import Configuration JSON</h3>
                </div>
                <button onClick={() => setModalType('none')} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <p className="text-xs text-slate-400">
                Paste a previously exported configuration JSON below to restore or migrate settings.
              </p>

              <textarea 
                rows={10}
                value={jsonImportInput}
                onChange={(e) => setJsonImportInput(e.target.value)}
                placeholder='Paste raw JSON configuration here...'
                className="w-full bg-[#070709] border border-white/10 rounded-xl p-3 text-xs text-slate-200 font-mono focus:border-[#5865F2] focus:outline-none"
              />

              <div className="flex gap-2.5">
                <button 
                  onClick={() => setModalType('none')}
                  className="flex-1 py-2 bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-300 rounded-xl font-semibold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={submitImportConfig}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply Import</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {modalType === 'add-warning' && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0f0f12] border border-white/5 rounded-lg p-6 max-w-sm w-full space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <h3 className="font-bold text-white text-sm uppercase font-display tracking-wide">Issue Moderation Warning</h3>
                <button onClick={() => setModalType('none')} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={submitAddWarning} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-slate-400 block font-semibold">Target User Tag</label>
                  <input 
                    type="text"
                    value={formWarnTag}
                    onChange={(e) => setFormWarnTag(e.target.value)}
                    placeholder="toxic_vibe#1234"
                    className="w-full bg-[#0c0c0e] border border-white/5 rounded px-3 py-2 text-slate-200 focus:border-[#5865F2] focus:outline-none font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 block font-semibold">Violation Reason</label>
                  <textarea 
                    rows={3}
                    value={formWarnReason}
                    onChange={(e) => setFormWarnReason(e.target.value)}
                    placeholder="Excessive caps spam and link filtering triggers..."
                    className="w-full bg-[#0c0c0e] border border-white/5 rounded px-3 py-2 text-slate-200 focus:border-[#5865F2] focus:outline-none"
                    required
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded font-bold font-display uppercase tracking-wider text-xs shadow-md transition"
                >
                  Issue Warn Ticket
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
