/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, MessageSquare, PlusCircle, 
  ArrowLeft, ChevronDown, ChevronUp, Search, Settings, Ticket, 
  Lock, Shield, Clock, Sparkles, Layers, Bot, Send, Check, 
  Crown, Info, ExternalLink, FileText, Users, HelpCircle, 
  Globe, Calendar, Bell, FolderPlus, X, AlertCircle, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DiscordEmoji, 
  nexus_ticket, 
  nexus_createticket 
} from '../emojis';

interface TicketSetupProps {
  activeMenu?: string;
  discordUser: { username: string; id: string; avatarUrl: string } | null;
  triggerToast: (msg: string) => void;
  addAuditLog: (module: string, action: string, reason: string) => void;
}

interface TicketPanelItem {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
  openTicketsCount: number;
  targetChannel: string;
  buttonLabel: string;
  buttonEmoji: string;
  buttonColor: string; // '#5865F2' | '#4F545C' | '#57F287' | '#ED4245'
  embedTitle: string;
  embedDescription: string;
  embedFooter: string;
  welcomeTitle: string;
  welcomeDescription: string;
  autoCloseMode: string;
  claimingEnabled: boolean;
  saveTranscripts: boolean;
  namingFormat: string;
  maxUserTickets: number;
  maxServerTickets: number;
}

interface SimulatedTicket {
  id: string;
  channelName: string;
  categoryName: string;
  creatorName: string;
  status: 'open' | 'claimed' | 'closed';
  claimedBy?: string;
  welcomeMessage: string;
  messages: {
    sender: 'user' | 'bot' | 'moderator' | 'system';
    senderName: string;
    text: string;
    time: string;
  }[];
}

// Preloaded mock Discord categories & channels
const DISCORD_CATEGORIES = [
  'Ticket',
  'TICKETS (SUPPORT)',
  'BILLING-QUERIES',
  'TECH-SUPPORT',
  'GAME-SERVERS'
];

const DISCORD_CHANNELS = [
  { id: '1', name: 'create-a-ticket' },
  { id: '2', name: 'support-desk' },
  { id: '3', name: 'help' },
  { id: '4', name: 'general' }
];

export function TicketSetup({ activeMenu, discordUser, triggerToast, addAuditLog }: TicketSetupProps) {
  const userName = discordUser?.username || 'lucky';

  // Determine view based on activeMenu or state
  const [currentView, setCurrentView] = useState<'panels' | 'edit-panel' | 'config' | 'management'>('panels');

  useEffect(() => {
    if (activeMenu === 'tickets-config') {
      setCurrentView('config');
    } else if (activeMenu === 'tickets-management') {
      setCurrentView('management');
    } else if (activeMenu === 'tickets-panels' || activeMenu === 'tickets') {
      if (currentView !== 'edit-panel') {
        setCurrentView('panels');
      }
    }
  }, [activeMenu]);

  // Panels List State
  const [panels, setPanels] = useState<TicketPanelItem[]>([
    {
      id: 'panel-1',
      name: 'Test',
      category: 'Ticket',
      enabled: true,
      openTicketsCount: 1,
      targetChannel: '1',
      buttonLabel: 'Create a ticket',
      buttonEmoji: '🎫',
      buttonColor: '#5865F2',
      embedTitle: 'Create a ticket',
      embedDescription: 'Please click on the button below to create a support ticket.',
      embedFooter: 'Tickety | Tickety.top',
      welcomeTitle: 'Ticket Created',
      welcomeDescription: 'Welcome **{ticket.creator.mention}**, thank you for reaching out to our support team! Please describe your issue in detail.',
      autoCloseMode: 'Staff choose',
      claimingEnabled: true,
      saveTranscripts: true,
      namingFormat: '{panel.name}-{ticket.creator.username}',
      maxUserTickets: 1,
      maxServerTickets: 0
    }
  ]);

  const [panelSearch, setPanelSearch] = useState<string>('');
  const [selectedPanelId, setSelectedPanelId] = useState<string>('panel-1');

  // Active Editing Panel State
  const activePanel = panels.find(p => p.id === selectedPanelId) || panels[0];

  // Subtab inside "Edit a Panel"
  const [editSubTab, setEditSubTab] = useState<
    'general' | 'embed' | 'messages' | 'forms' | 'roles' | 'availability' | 'logging' | 'ai' | 'advanced'
  >('general');

  // Accordions collapse state inside "Edit a Panel"
  const [openAccordions, setOpenAccordions] = useState<{ [key: string]: boolean }>({
    panelSettings: true,
    ticketLocation: true,
    transcriptSettings: true,
    ticketSettings: true,
    claiming: true,
    ticketFooter: false,
    closeRequests: false,
    ticketPermissions: false,
    linkedPanels: true,
    panelMessage: true,
    faqConfig: false,
    welcomeMessage: true,
    supportHours: true,
    logChannel: true,
    aiAssistant: true,
    advancedSettings: true
  });

  const toggleAccordion = (key: string) => {
    setOpenAccordions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Editable form fields for active panel
  const [editName, setEditName] = useState(activePanel.name);
  const [editCategory, setEditCategory] = useState(activePanel.category);
  const [editEnabled, setEditEnabled] = useState(activePanel.enabled);
  const [editTargetChannel, setEditTargetChannel] = useState(activePanel.targetChannel);
  const [editButtonLabel, setEditButtonLabel] = useState(activePanel.buttonLabel);
  const [editButtonEmoji, setEditButtonEmoji] = useState(activePanel.buttonEmoji);
  const [editButtonColor, setEditButtonColor] = useState(activePanel.buttonColor);
  const [editEmbedTitle, setEditEmbedTitle] = useState(activePanel.embedTitle);
  const [editEmbedDesc, setEditEmbedDesc] = useState(activePanel.embedDescription);
  const [editEmbedFooter, setEditEmbedFooter] = useState(activePanel.embedFooter);
  const [editWelcomeTitle, setEditWelcomeTitle] = useState(activePanel.welcomeTitle);
  const [editWelcomeDesc, setEditWelcomeDesc] = useState(activePanel.welcomeDescription);
  const [editAutoClose, setEditAutoClose] = useState(activePanel.autoCloseMode);
  const [editClaiming, setEditClaiming] = useState(activePanel.claimingEnabled);
  const [editTranscripts, setEditTranscripts] = useState(activePanel.saveTranscripts);
  const [editNamingFormat, setEditNamingFormat] = useState(activePanel.namingFormat);
  const [editMaxUserTickets, setEditMaxUserTickets] = useState(activePanel.maxUserTickets);
  const [editMaxServerTickets, setEditMaxServerTickets] = useState(activePanel.maxServerTickets);

  // Sync edit state when activePanel changes
  useEffect(() => {
    if (activePanel) {
      setEditName(activePanel.name);
      setEditCategory(activePanel.category);
      setEditEnabled(activePanel.enabled);
      setEditTargetChannel(activePanel.targetChannel);
      setEditButtonLabel(activePanel.buttonLabel);
      setEditButtonEmoji(activePanel.buttonEmoji);
      setEditButtonColor(activePanel.buttonColor);
      setEditEmbedTitle(activePanel.embedTitle);
      setEditEmbedDesc(activePanel.embedDescription);
      setEditEmbedFooter(activePanel.embedFooter);
      setEditWelcomeTitle(activePanel.welcomeTitle);
      setEditWelcomeDesc(activePanel.welcomeDescription);
      setEditAutoClose(activePanel.autoCloseMode);
      setEditClaiming(activePanel.claimingEnabled);
      setEditTranscripts(activePanel.saveTranscripts);
      setEditNamingFormat(activePanel.namingFormat);
      setEditMaxUserTickets(activePanel.maxUserTickets);
      setEditMaxServerTickets(activePanel.maxServerTickets);
    }
  }, [selectedPanelId]);

  // Support Hours State
  const [hoursEnabled, setHoursEnabled] = useState<boolean>(true);
  const [timezone, setTimezone] = useState<string>('Calcutta (UTC+5:30)');
  const [scheduleMode, setScheduleMode] = useState<'basic' | 'advanced'>('basic');
  const [weekSchedule, setWeekSchedule] = useState<{ [day: string]: { open: boolean; hours: string } }>({
    Monday: { open: true, hours: '09:00 to 17:00' },
    Tuesday: { open: true, hours: '09:00 to 17:00' },
    Wednesday: { open: true, hours: '09:00 to 17:00' },
    Thursday: { open: true, hours: '09:00 to 17:00' },
    Friday: { open: true, hours: '09:00 to 17:00' },
    Saturday: { open: false, hours: 'Closed' },
    Sunday: { open: false, hours: 'Closed' }
  });

  // Questions / Forms state
  const [questions, setQuestions] = useState<{ id: string; title: string; type: 'short' | 'paragraph'; required: boolean }[]>([
    { id: 'q1', title: 'What issue are you experiencing?', type: 'paragraph', required: true }
  ]);
  const [newQuestionTitle, setNewQuestionTitle] = useState('');

  // Simulated Live Tickets State
  const [simulatedTickets, setSimulatedTickets] = useState<SimulatedTicket[]>([
    {
      id: 'ticket-1',
      channelName: 'lucky-dev-ticket-1',
      categoryName: 'Ticket',
      creatorName: 'lucky-dev',
      status: 'open',
      welcomeMessage: 'Welcome @lucky-dev, thank you for reaching out to our support team! Please describe your issue in detail.',
      messages: [
        {
          sender: 'system',
          senderName: 'SYSTEM',
          text: 'Ticket opened by @lucky-dev. Staff notified.',
          time: 'Today at 3:00 PM'
        },
        {
          sender: 'user',
          senderName: 'lucky-dev',
          text: 'Hello, I need help configuring server permissions.',
          time: 'Today at 3:01 PM'
        }
      ]
    }
  ]);
  const [activeSimId, setActiveSimId] = useState<string>('ticket-1');
  const [simText, setSimText] = useState<string>('');

  // Handler: Save Panel Changes
  const handleSavePanel = () => {
    setPanels(prev => prev.map(p => {
      if (p.id === selectedPanelId) {
        return {
          ...p,
          name: editName,
          category: editCategory,
          enabled: editEnabled,
          targetChannel: editTargetChannel,
          buttonLabel: editButtonLabel,
          buttonEmoji: editButtonEmoji,
          buttonColor: editButtonColor,
          embedTitle: editEmbedTitle,
          embedDescription: editEmbedDesc,
          embedFooter: editEmbedFooter,
          welcomeTitle: editWelcomeTitle,
          welcomeDescription: editWelcomeDesc,
          autoCloseMode: editAutoClose,
          claimingEnabled: editClaiming,
          saveTranscripts: editTranscripts,
          namingFormat: editNamingFormat,
          maxUserTickets: editMaxUserTickets,
          maxServerTickets: editMaxServerTickets
        };
      }
      return p;
    }));

    addAuditLog('TICKETS', 'PANEL_SAVE', `Updated ticket panel configuration "${editName}"`);
    triggerToast(`Successfully saved panel "${editName}" settings!`);
  };

  // Handler: Create New Panel
  const handleCreateNewPanel = () => {
    const newId = `panel-${Date.now()}`;
    const newP: TicketPanelItem = {
      id: newId,
      name: `New Support Panel`,
      category: 'Ticket',
      enabled: true,
      openTicketsCount: 0,
      targetChannel: '1',
      buttonLabel: 'Create a ticket',
      buttonEmoji: '🎫',
      buttonColor: '#5865F2',
      embedTitle: 'Create a ticket',
      embedDescription: 'Please click on the button below to create a support ticket.',
      embedFooter: 'Tickety | Tickety.top',
      welcomeTitle: 'Ticket Created',
      welcomeDescription: 'Welcome **{ticket.creator.mention}**, thank you for reaching out to our support team!',
      autoCloseMode: 'Staff choose',
      claimingEnabled: true,
      saveTranscripts: true,
      namingFormat: '{panel.name}-{ticket.creator.username}',
      maxUserTickets: 1,
      maxServerTickets: 0
    };

    setPanels([...panels, newP]);
    setSelectedPanelId(newId);
    setCurrentView('edit-panel');
    triggerToast('Created new ticket panel! Customize your settings below.');
  };

  // Handler: Delete Panel
  const handleDeletePanel = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (panels.length <= 1) {
      triggerToast('Cannot delete the last ticket panel.');
      return;
    }
    setPanels(panels.filter(p => p.id !== id));
    triggerToast('Ticket panel deleted.');
  };

  // Handler: Claim Ticket in Management (Renames channel to add ✅ prefix!)
  const handleClaimTicket = (ticketId: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setSimulatedTickets(prev => prev.map(t => {
      if (t.id === ticketId) {
        const cleanName = t.channelName.replace(/^✅/, '');
        const newName = `✅${cleanName}`;
        return {
          ...t,
          channelName: newName,
          status: 'claimed' as const,
          claimedBy: userName,
          messages: [
            ...t.messages,
            {
              sender: 'system',
              senderName: 'SYSTEM',
              text: `Ticket claimed by ${userName}. Channel renamed to ${newName}.`,
              time
            }
          ]
        };
      }
      return t;
    }));
    triggerToast(`Ticket claimed by ${userName}! Added ✅ to channel name.`);
  };

  // Handler: Close Ticket
  const handleCloseTicket = (ticketId: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setSimulatedTickets(prev => prev.map(t => {
      if (t.id === ticketId) {
        return {
          ...t,
          status: 'closed' as const,
          messages: [
            ...t.messages,
            {
              sender: 'system',
              senderName: 'SYSTEM',
              text: `Ticket closed by ${userName}. Archived ticket log saved.`,
              time
            }
          ]
        };
      }
      return t;
    }));
    triggerToast('Ticket closed and archived.');
  };

  // Handler: Send Message in Live Ticket
  const handleSendLiveMsg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simText.trim() || !activeSimId) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setSimulatedTickets(prev => prev.map(t => {
      if (t.id === activeSimId) {
        return {
          ...t,
          messages: [
            ...t.messages,
            {
              sender: 'user',
              senderName: userName,
              text: simText.trim(),
              time
            }
          ]
        };
      }
      return t;
    }));

    setSimText('');
  };

  // Active simulated ticket
  const activeSimTicket = simulatedTickets.find(t => t.id === activeSimId) || simulatedTickets[0];

  return (
    <div className="w-full text-slate-200 font-sans space-y-6">

      {/* VIEW 1: TICKET PANELS LIST PAGE */}
      {currentView === 'panels' && (
        <div className="space-y-6">
          {/* HEADER SECTION */}
          <div>
            <h1 className="text-xl font-bold text-white font-display">Ticket Panels</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Ticket panels allow your users to interact with the ticket system.
            </p>
          </div>

          {/* CREATE PANEL & TEMPLATES ROW */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              onClick={handleCreateNewPanel}
              className="bg-[#131722] border border-white/5 hover:border-[#5865F2]/50 rounded-2xl p-6 flex items-center justify-between cursor-pointer transition group shadow-lg"
            >
              <div className="space-y-1">
                <span className="text-sm font-bold text-white group-hover:text-[#5865F2] transition font-display block">
                  Create New Panel
                </span>
                <p className="text-xs text-slate-400">Build a customized ticket panel for your server.</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/20 flex items-center justify-center text-[#5865F2] group-hover:scale-110 transition">
                <Plus className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-[#131722] border border-white/5 hover:border-amber-500/40 rounded-2xl p-6 flex items-center justify-between cursor-pointer transition group shadow-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-bold text-white group-hover:text-amber-400 transition font-display">
                    Use a Template
                  </span>
                </div>
                <p className="text-xs text-slate-400">Pre-configured ticket layouts for Gaming, Support & Billing.</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* MAIN PANELS CONTAINER */}
          <div className="bg-[#131722] border border-white/5 rounded-2xl p-6 space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white font-display">Your Ticket Panels</h2>
                <span className="text-xs font-semibold text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full font-mono">
                  {panels.length}/25
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Enter a panel name"
                  value={panelSearch}
                  onChange={(e) => setPanelSearch(e.target.value)}
                  className="w-full bg-[#0F121C] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#5865F2] transition"
                />
              </div>
            </div>

            {/* Panels List */}
            <div className="space-y-3">
              {panels
                .filter(p => p.name.toLowerCase().includes(panelSearch.toLowerCase()))
                .map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedPanelId(p.id);
                      setCurrentView('edit-panel');
                    }}
                    className="bg-[#181C2A] hover:bg-[#1C2132] border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer transition group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-lg shrink-0">
                        {p.buttonEmoji || '🎫'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white group-hover:text-[#5865F2] transition font-display">
                            {p.name}
                          </span>
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                            Enabled
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                          <span className="flex items-center gap-1 text-indigo-400">
                            🔗 {p.category || 'Ticket'}
                          </span>
                          <span>•</span>
                          <span>{p.openTicketsCount} Open Tickets</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={(e) => handleDeletePanel(p.id, e)}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition cursor-pointer"
                        title="Delete Panel"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPanelId(p.id);
                          setCurrentView('edit-panel');
                        }}
                        className="flex items-center gap-1.5 bg-[#5865F2] hover:bg-[#4752C4] text-white px-3.5 py-2 rounded-lg text-xs font-bold transition shadow cursor-pointer"
                      >
                        <span>Edit Panel</span>
                        <ChevronDown className="w-4 h-4 -rotate-90" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: EDIT A PANEL VIEW */}
      {currentView === 'edit-panel' && (
        <div className="space-y-6">
          {/* HEADER & TOP CONTROL BAR */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#131722] border border-white/5 rounded-2xl p-4 shadow-xl">
            <button
              onClick={() => setCurrentView('panels')}
              className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-2 rounded-xl transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Edit a Panel</span>
            </button>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              {/* Channel Selector */}
              <div className="relative">
                <select
                  value={editTargetChannel}
                  onChange={(e) => setEditTargetChannel(e.target.value)}
                  className="w-full sm:w-60 bg-[#0F121C] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#5865F2] cursor-pointer"
                >
                  <option value="" disabled>Channel to post panel in...</option>
                  {DISCORD_CHANNELS.map(ch => (
                    <option key={ch.id} value={ch.id}>#{ch.name}</option>
                  ))}
                </select>
              </div>

              {/* Primary Action Button */}
              <button
                onClick={handleSavePanel}
                className="flex items-center justify-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-[#5865F2]/20 hover:scale-102 transition cursor-pointer font-display"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send the Panel</span>
              </button>
            </div>
          </div>

          {/* SUBTABS HORIZONTAL BAR */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-white/5 no-scrollbar text-xs font-semibold">
            {[
              { id: 'general', label: 'General' },
              { id: 'embed', label: 'Embed' },
              { id: 'messages', label: 'Messages' },
              { id: 'forms', label: 'Forms' },
              { id: 'roles', label: 'Roles' },
              { id: 'availability', label: 'Availability' },
              { id: 'logging', label: 'Logging' },
              { id: 'ai', label: 'AI' },
              { id: 'advanced', label: 'Advanced' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setEditSubTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl whitespace-nowrap transition cursor-pointer ${
                  editSubTab === tab.id
                    ? 'bg-[#5865F2] text-white font-bold shadow shadow-[#5865F2]/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* SUBTAB CONTENT PANELS */}
          <div className="bg-[#131722] border border-white/5 rounded-2xl p-6 space-y-4 shadow-xl">

            {/* TAB 1: GENERAL */}
            {editSubTab === 'general' && (
              <div className="space-y-4">

                {/* ACCORDION 1: Panel Settings */}
                <div className="border border-white/5 rounded-xl overflow-hidden bg-[#181C2A]">
                  <button
                    onClick={() => toggleAccordion('panelSettings')}
                    className="w-full flex justify-between items-center p-4 text-left font-bold text-white text-xs hover:bg-white/[0.02] transition"
                  >
                    <span>Panel Settings</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openAccordions.panelSettings ? 'rotate-180' : ''}`} />
                  </button>
                  {openAccordions.panelSettings && (
                    <div className="p-4 border-t border-white/5 space-y-4 text-xs">
                      <div className="flex justify-between items-center">
                        <div>
                          <label className="font-bold text-slate-200 block">Panel Enabled</label>
                          <p className="text-[11px] text-slate-400">Toggle if this ticket panel is active in Discord.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditEnabled(!editEnabled)}
                          className={`w-11 h-6 rounded-full transition-all relative flex items-center px-1 ${
                            editEnabled ? 'bg-[#5865F2]' : 'bg-slate-800'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${editEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-200 block">Panel Name</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-[#0F121C] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-[#5865F2] focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-200 block">Support Roles</label>
                        <div className="flex flex-wrap items-center gap-2 p-2 bg-[#0F121C] border border-white/10 rounded-xl">
                          <span className="bg-[#5865F2]/20 border border-[#5865F2]/40 text-[#5865F2] px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1.5">
                            LUCKY BOT
                            <X className="w-3 h-3 cursor-pointer" />
                          </span>
                          <select className="bg-transparent text-slate-400 text-xs focus:outline-none cursor-pointer">
                            <option value="">Select roles...</option>
                            <option value="admin">Administrator</option>
                            <option value="mod">Support Team</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ACCORDION 2: Ticket Location */}
                <div className="border border-white/5 rounded-xl overflow-hidden bg-[#181C2A]">
                  <button
                    onClick={() => toggleAccordion('ticketLocation')}
                    className="w-full flex justify-between items-center p-4 text-left font-bold text-white text-xs hover:bg-white/[0.02] transition"
                  >
                    <span>Ticket Location</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openAccordions.ticketLocation ? 'rotate-180' : ''}`} />
                  </button>
                  {openAccordions.ticketLocation && (
                    <div className="p-4 border-t border-white/5 space-y-4 text-xs">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-200 block">Panel Category</label>
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="w-full bg-[#0F121C] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-[#5865F2] focus:outline-none"
                        >
                          {DISCORD_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-200 block">Overflow Categories</label>
                        <select className="w-full bg-[#0F121C] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-400 focus:outline-none">
                          <option value="">Select overflow categories...</option>
                          <option value="overflow-1">TICKETS (OVERFLOW 1)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* ACCORDION 3: Transcript Settings */}
                <div className="border border-white/5 rounded-xl overflow-hidden bg-[#181C2A]">
                  <button
                    onClick={() => toggleAccordion('transcriptSettings')}
                    className="w-full flex justify-between items-center p-4 text-left font-bold text-white text-xs hover:bg-white/[0.02] transition"
                  >
                    <span>Transcript Settings</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openAccordions.transcriptSettings ? 'rotate-180' : ''}`} />
                  </button>
                  {openAccordions.transcriptSettings && (
                    <div className="p-4 border-t border-white/5 space-y-4 text-xs">
                      <div className="flex justify-between items-center">
                        <div>
                          <label className="font-bold text-slate-200 block">Save Transcripts</label>
                          <p className="text-[11px] text-slate-400">Automatically generate web transcripts when tickets close.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditTranscripts(!editTranscripts)}
                          className={`w-11 h-6 rounded-full transition-all relative flex items-center px-1 ${
                            editTranscripts ? 'bg-[#5865F2]' : 'bg-slate-800'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${editTranscripts ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ACCORDION 4: Ticket Settings */}
                <div className="border border-white/5 rounded-xl overflow-hidden bg-[#181C2A]">
                  <button
                    onClick={() => toggleAccordion('ticketSettings')}
                    className="w-full flex justify-between items-center p-4 text-left font-bold text-white text-xs hover:bg-white/[0.02] transition"
                  >
                    <span>Ticket Settings</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openAccordions.ticketSettings ? 'rotate-180' : ''}`} />
                  </button>
                  {openAccordions.ticketSettings && (
                    <div className="p-4 border-t border-white/5 space-y-4 text-xs">
                      <div className="space-y-2">
                        <label className="font-bold text-slate-200 block">Channel Name Generation</label>
                        <div className="space-y-2">
                          {[
                            '{panel.name}-{ticket.creator.username}',
                            '{panel.name}-{ticket.number}',
                            'Custom format'
                          ].map(fmt => (
                            <label
                              key={fmt}
                              onClick={() => setEditNamingFormat(fmt)}
                              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                                editNamingFormat === fmt
                                  ? 'bg-[#5865F2]/10 border-[#5865F2] text-white'
                                  : 'bg-[#0F121C] border-white/10 text-slate-300 hover:border-white/20'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                editNamingFormat === fmt ? 'border-[#5865F2] bg-[#5865F2]' : 'border-slate-500'
                              }`}>
                                {editNamingFormat === fmt && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                              <span className="font-mono text-xs">{fmt}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-200 block">Max Open Tickets per User</label>
                          <div className="flex items-center gap-2 bg-[#0F121C] border border-white/10 rounded-xl p-1.5 w-36 justify-between">
                            <button 
                              onClick={() => setEditMaxUserTickets(Math.max(1, editMaxUserTickets - 1))}
                              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center font-bold"
                            >-</button>
                            <span className="font-bold text-white font-mono">{editMaxUserTickets}</span>
                            <button 
                              onClick={() => setEditMaxUserTickets(editMaxUserTickets + 1)}
                              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center font-bold"
                            >+</button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-200 block">Max Open Tickets per Server</label>
                          <div className="flex items-center gap-2 bg-[#0F121C] border border-white/10 rounded-xl p-1.5 w-36 justify-between">
                            <button 
                              onClick={() => setEditMaxServerTickets(Math.max(0, editMaxServerTickets - 1))}
                              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center font-bold"
                            >-</button>
                            <span className="font-bold text-white font-mono">{editMaxServerTickets}</span>
                            <button 
                              onClick={() => setEditMaxServerTickets(editMaxServerTickets + 1)}
                              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center font-bold"
                            >+</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ACCORDION 5: Claiming */}
                <div className="border border-white/5 rounded-xl overflow-hidden bg-[#181C2A]">
                  <button
                    onClick={() => toggleAccordion('claiming')}
                    className="w-full flex justify-between items-center p-4 text-left font-bold text-white text-xs hover:bg-white/[0.02] transition"
                  >
                    <span>Claiming</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openAccordions.claiming ? 'rotate-180' : ''}`} />
                  </button>
                  {openAccordions.claiming && (
                    <div className="p-4 border-t border-white/5 space-y-4 text-xs">
                      <div className="flex justify-between items-center">
                        <div>
                          <label className="font-bold text-slate-200 block">Claiming System</label>
                          <p className="text-[11px] text-slate-400">Enable support staff to claim tickets and add ✅ to channel names.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditClaiming(!editClaiming)}
                          className={`w-11 h-6 rounded-full transition-all relative flex items-center px-1 ${
                            editClaiming ? 'bg-[#5865F2]' : 'bg-slate-800'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${editClaiming ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB 2: EMBED */}
            {editSubTab === 'embed' && (
              <div className="space-y-6">
                <div className="p-4 bg-[#181C2A] border border-white/5 rounded-xl space-y-4">
                  <h3 className="font-bold text-white text-xs font-display">Panel Message & Embed Editor</h3>

                  {/* DISCORD INTERACTIVE EMBED PREVIEW */}
                  <div className="bg-[#2f3136] p-4 rounded-xl border border-[#202225] space-y-3 font-sans">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center font-bold text-white text-xs">
                        TB
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-xs">Ticket Bot</span>
                          <span className="bg-[#5865F2] text-white text-[9px] px-1 rounded font-bold">APP</span>
                        </div>
                        <span className="text-[10px] text-slate-400">Today at 3:09 AM</span>
                      </div>
                    </div>

                    {/* EMBED CARD */}
                    <div className="border-l-4 border-[#5865F2] bg-[#2f3136] p-3 rounded-r-md space-y-2">
                      <input
                        type="text"
                        value={editEmbedTitle}
                        onChange={(e) => setEditEmbedTitle(e.target.value)}
                        className="w-full bg-transparent font-bold text-white text-sm focus:outline-none focus:bg-black/20 p-1 rounded"
                        placeholder="Embed Title"
                      />
                      <textarea
                        value={editEmbedDesc}
                        onChange={(e) => setEditEmbedDesc(e.target.value)}
                        rows={2}
                        className="w-full bg-transparent text-xs text-slate-300 focus:outline-none focus:bg-black/20 p-1 rounded"
                        placeholder="Embed Description"
                      />
                      <input
                        type="text"
                        value={editEmbedFooter}
                        onChange={(e) => setEditEmbedFooter(e.target.value)}
                        className="w-full bg-transparent text-[10px] text-slate-400 focus:outline-none focus:bg-black/20 p-1 rounded"
                        placeholder="Footer text"
                      />
                    </div>

                    {/* EMBED BUTTON PREVIEW */}
                    <div className="pt-2">
                      <button
                        style={{ backgroundColor: editButtonColor }}
                        className="flex items-center gap-2 text-white px-4 py-2 rounded-md text-xs font-semibold shadow hover:opacity-90 transition"
                      >
                        <span>{editButtonEmoji}</span>
                        <span>{editButtonLabel}</span>
                      </button>
                    </div>
                  </div>

                  {/* BUTTON CUSTOMIZER */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-200 text-xs block">Button Label</label>
                      <input
                        type="text"
                        value={editButtonLabel}
                        onChange={(e) => setEditButtonLabel(e.target.value)}
                        className="w-full bg-[#0F121C] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-[#5865F2] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-200 text-xs block">Button Color</label>
                      <div className="flex items-center gap-2 pt-1">
                        {[
                          { color: '#5865F2', name: 'Blurple' },
                          { color: '#4F545C', name: 'Grey' },
                          { color: '#57F287', name: 'Green' },
                          { color: '#ED4245', name: 'Red' }
                        ].map(c => (
                          <button
                            key={c.color}
                            onClick={() => setEditButtonColor(c.color)}
                            style={{ backgroundColor: c.color }}
                            className={`w-7 h-7 rounded-full border-2 transition ${
                              editButtonColor === c.color ? 'border-white scale-110 shadow' : 'border-transparent opacity-80 hover:opacity-100'
                            }`}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: MESSAGES */}
            {editSubTab === 'messages' && (
              <div className="space-y-6">
                <div className="p-4 bg-[#181C2A] border border-white/5 rounded-xl space-y-4 text-xs">
                  <h3 className="font-bold text-white font-display">Welcome Message Embed Builder</h3>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-200 block">Welcome Title</label>
                      <input
                        type="text"
                        value={editWelcomeTitle}
                        onChange={(e) => setEditWelcomeTitle(e.target.value)}
                        className="w-full bg-[#0F121C] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-[#5865F2] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-200 block">Welcome Description</label>
                      <textarea
                        value={editWelcomeDesc}
                        onChange={(e) => setEditWelcomeDesc(e.target.value)}
                        rows={3}
                        className="w-full bg-[#0F121C] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-[#5865F2] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* WELCOME BUTTON CARDS */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                    <div className="p-3 bg-[#0F121C] border border-white/10 rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white">Close Button</span>
                        <span className="text-emerald-400 text-[10px] font-bold">Enabled</span>
                      </div>
                      <div className="flex items-center gap-2 bg-[#4F545C] text-white px-3 py-1.5 rounded-lg text-xs font-bold w-fit">
                        <span>🔒</span>
                        <span>Close</span>
                      </div>
                    </div>

                    <div className="p-3 bg-[#0F121C] border border-white/10 rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white">Claim Button</span>
                        <span className="text-emerald-400 text-[10px] font-bold">Enabled</span>
                      </div>
                      <div className="flex items-center gap-2 bg-[#57F287] text-black px-3 py-1.5 rounded-lg text-xs font-bold w-fit">
                        <span>🙌</span>
                        <span>Claim</span>
                      </div>
                    </div>

                    <div className="p-3 bg-[#0F121C] border border-white/10 rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white">Request Close</span>
                        <span className="text-slate-500 text-[10px] font-bold">Disabled</span>
                      </div>
                      <div className="flex items-center gap-2 bg-[#ED4245] text-white px-3 py-1.5 rounded-lg text-xs font-bold w-fit opacity-50">
                        <span>⏳</span>
                        <span>Request Close</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: FORMS */}
            {editSubTab === 'forms' && (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-[#181C2A] border border-white/5 rounded-xl space-y-4">
                  <h3 className="font-bold text-white font-display">Ticket Opening Questions / Modal Form</h3>
                  <p className="text-slate-400">Configure questions asked to members when opening a ticket.</p>

                  <div className="space-y-2">
                    {questions.map((q, idx) => (
                      <div key={q.id} className="flex items-center justify-between p-3 bg-[#0F121C] border border-white/10 rounded-xl">
                        <span className="font-semibold text-white">{idx + 1}. {q.title}</span>
                        <button
                          onClick={() => setQuestions(questions.filter(item => item.id !== q.id))}
                          className="p-1 text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="Add a new form question..."
                      value={newQuestionTitle}
                      onChange={(e) => setNewQuestionTitle(e.target.value)}
                      className="flex-1 bg-[#0F121C] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-[#5865F2] focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        if (!newQuestionTitle.trim()) return;
                        setQuestions([...questions, { id: `q-${Date.now()}`, title: newQuestionTitle.trim(), type: 'paragraph', required: true }]);
                        setNewQuestionTitle('');
                        triggerToast('Added question to form!');
                      }}
                      className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded-xl font-bold cursor-pointer"
                    >
                      Add Question
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: ROLES */}
            {editSubTab === 'roles' && (
              <div className="p-4 bg-[#181C2A] border border-white/5 rounded-xl space-y-4 text-xs">
                <div className="p-3 bg-[#5865F2]/10 border border-[#5865F2]/20 rounded-xl text-[#5865F2] font-semibold flex items-center justify-between">
                  <span>Free: Limited to one action per type</span>
                  <button className="bg-[#5865F2] text-white px-3 py-1.5 rounded-lg font-bold">
                    Create an Action
                  </button>
                </div>
              </div>
            )}

            {/* TAB 6: AVAILABILITY */}
            {editSubTab === 'availability' && (
              <div className="p-4 bg-[#181C2A] border border-white/5 rounded-xl space-y-4 text-xs">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <div>
                    <h3 className="font-bold text-white font-display">Support Hours</h3>
                    <p className="text-slate-400">Configure when your team is available to handle support requests.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHoursEnabled(!hoursEnabled)}
                    className={`w-11 h-6 rounded-full transition-all relative flex items-center px-1 ${
                      hoursEnabled ? 'bg-[#5865F2]' : 'bg-slate-800'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${hoursEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-200 block">Timezone</label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full bg-[#0F121C] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="Calcutta (UTC+5:30)">Calcutta (UTC+5:30)</option>
                      <option value="UTC">UTC (Coordinated Universal Time)</option>
                      <option value="EST">EST (US Eastern)</option>
                    </select>
                  </div>
                </div>

                {/* Days Schedule List */}
                <div className="space-y-2 pt-2">
                  {Object.entries(weekSchedule).map(([day, val]) => {
                    const item = val as { open: boolean; hours: string };
                    return (
                      <div key={day} className="flex items-center justify-between p-3 bg-[#0F121C] border border-white/10 rounded-xl">
                        <span className="font-bold text-white w-28">{day}</span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              setWeekSchedule({
                                ...weekSchedule,
                                [day]: { ...item, open: !item.open }
                              });
                            }}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                              item.open ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400 border border-white/5'
                            }`}
                          >
                            {item.open ? '• Open' : 'Closed'}
                          </button>
                          <span className="font-mono text-slate-400 text-xs">{item.hours}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 7: LOGGING */}
            {editSubTab === 'logging' && (
              <div className="p-4 bg-[#181C2A] border border-white/5 rounded-xl space-y-4 text-xs">
                <h3 className="font-bold text-white font-display">Logging</h3>
                <div className="space-y-1">
                  <label className="font-bold text-slate-200 block">Log Channel</label>
                  <select className="w-full bg-[#0F121C] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none">
                    <option value="">Select a log channel...</option>
                    {DISCORD_CHANNELS.map(ch => (
                      <option key={ch.id} value={ch.id}>#{ch.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* TAB 8: AI */}
            {editSubTab === 'ai' && (
              <div className="p-4 bg-[#181C2A] border border-white/5 rounded-xl space-y-4 text-xs">
                <h3 className="font-bold text-white font-display">AI Support Assistant</h3>
                <p className="text-slate-400">Automate first responses to tickets using AI suggestions.</p>
                <div className="p-3 bg-[#5865F2]/10 border border-[#5865F2]/20 rounded-xl text-[#5865F2]">
                  AI Auto-Responder active for ticket category #{editCategory}.
                </div>
              </div>
            )}

            {/* TAB 9: ADVANCED */}
            {editSubTab === 'advanced' && (
              <div className="p-4 bg-[#181C2A] border border-white/5 rounded-xl space-y-4 text-xs">
                <h3 className="font-bold text-white font-display">Advanced Settings</h3>
                <div className="flex justify-between items-center">
                  <span>Sync Category Permissions on Move</span>
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* VIEW 3: CONFIGURATION VIEW */}
      {currentView === 'config' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-bold text-white font-display">Configuration</h1>
            <p className="text-xs text-slate-400 mt-0.5">Global ticket system defaults and bot handler permissions.</p>
          </div>

          <div className="bg-[#131722] border border-white/5 rounded-2xl p-6 space-y-4 text-xs shadow-xl">
            <div className="p-4 bg-[#181C2A] border border-white/5 rounded-xl space-y-3">
              <h3 className="font-bold text-white text-sm">Global Prefix & Handlers</h3>
              <p className="text-slate-400">Claimed ticket prefix: <code className="text-emerald-400 bg-black/40 px-1.5 py-0.5 rounded">✅</code></p>
              <p className="text-slate-400 font-mono">Example: ✅lucky-dev-ticket-1</p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: TICKET MANAGEMENT & LIVE SIMULATION VIEW */}
      {currentView === 'management' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-bold text-white font-display">Ticket Management</h1>
            <p className="text-xs text-slate-400 mt-0.5">View active tickets, test claim actions with ✅ prefix, and handle support chats.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* LEFT: OPEN TICKETS LIST */}
            <div className="bg-[#131722] border border-white/5 rounded-2xl p-4 space-y-3 shadow-xl">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider px-1">Active Tickets</h3>
              <div className="space-y-2">
                {simulatedTickets.map(t => (
                  <div
                    key={t.id}
                    onClick={() => setActiveSimId(t.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      activeSimId === t.id
                        ? 'bg-[#5865F2]/10 border-[#5865F2] text-white'
                        : 'bg-[#181C2A] border-white/5 text-slate-300 hover:bg-[#1C2132]'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs font-mono">{t.channelName}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        t.status === 'open' ? 'bg-emerald-500/10 text-emerald-400' :
                        t.status === 'claimed' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {t.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Creator: {t.creatorName}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: LIVE TICKET CHAT & CONTROLS */}
            <div className="md:col-span-2 bg-[#131722] border border-white/5 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-xl min-h-[450px]">
              {/* TICKET TOP BAR */}
              <div className="flex flex-wrap justify-between items-center gap-3 pb-3 border-b border-white/5">
                <div>
                  <h2 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                    <span>#</span>
                    <span>{activeSimTicket.channelName}</span>
                  </h2>
                  <p className="text-[11px] text-slate-400">Category: {activeSimTicket.categoryName}</p>
                </div>

                <div className="flex items-center gap-2">
                  {activeSimTicket.status === 'open' && (
                    <button
                      onClick={() => handleClaimTicket(activeSimTicket.id)}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Claim Ticket</span>
                    </button>
                  )}

                  {activeSimTicket.status !== 'closed' && (
                    <button
                      onClick={() => handleCloseTicket(activeSimTicket.id)}
                      className="flex items-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Close Ticket</span>
                    </button>
                  )}
                </div>
              </div>

              {/* MESSAGES LIST */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[300px]">
                {activeSimTicket.messages.map((m, idx) => (
                  <div key={idx} className={`p-3 rounded-xl border text-xs space-y-1 ${
                    m.sender === 'system' ? 'bg-amber-500/5 border-amber-500/20 text-amber-300' : 'bg-[#181C2A] border-white/5 text-slate-200'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#5865F2]">{m.senderName}</span>
                      <span className="text-[10px] text-slate-500">{m.time}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{m.text}</p>
                  </div>
                ))}
              </div>

              {/* INPUT BOX */}
              <form onSubmit={handleSendLiveMsg} className="flex items-center gap-2 pt-2 border-t border-white/5">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={simText}
                  onChange={(e) => setSimText(e.target.value)}
                  className="flex-1 bg-[#0F121C] border border-white/10 rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#5865F2]"
                />
                <button
                  type="submit"
                  className="bg-[#5865F2] hover:bg-[#4752C4] text-white p-2.5 rounded-xl transition cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
