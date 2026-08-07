/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, Trash2, MessageSquare, PlusCircle, 
  ArrowRight, FolderPlus, Send, X, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DiscordEmoji, 
  DiscordUserAvatar, 
  nexus_ticket, 
  nexus_createticket, 
  DISCORD_EMOJIS 
} from '../emojis';

// Interfaces for our Ticket Config
interface PanelButton {
  id: string;
  name: string;
  emoji: string;
  categoryName: string; // Target ticket creation category
  channelCategoryName?: string; // Channel category where tickets are routed
}

interface EmbedConfig {
  title: string;
  description: string;
  color: string;
  thumbnail: string;
  footer: string;
}

interface TicketPanelConfig {
  id: string;
  embed: EmbedConfig;
  buttons: PanelButton[];
  targetChannelId: string; // The channel where the panel is posted
  welcomeMessage: string;
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

interface TicketSetupProps {
  discordUser: { username: string; id: string; avatarUrl: string } | null;
  triggerToast: (msg: string) => void;
  addAuditLog: (module: string, action: string, reason: string) => void;
}

// Preloaded mock Discord categories
const DISCORD_CATEGORIES = [
  'TICKETS (SUPPORT)',
  'BILLING-QUERIES',
  'TECH-SUPPORT',
  'GAME-SERVERS',
  'GENERAL-HELP'
];

// Preloaded mock Discord channels
const DISCORD_CHANNELS = [
  { id: '1', name: 'create-a-ticket' },
  { id: '2', name: 'support-desk' },
  { id: '3', name: 'help' },
  { id: '4', name: 'general' }
];

export function TicketSetup({ discordUser, triggerToast, addAuditLog }: TicketSetupProps) {
  // Current user name
  const userName = discordUser?.username || 'lucky';

  // State for active panel views ('setup' | 'config' | 'simulation')
  const [activeTab, setActiveTab] = useState<'setup' | 'config' | 'simulation'>('setup');

  // Interactive Ticket Configs list (populated with a pre-seeded one or empty)
  const [panelConfigs, setPanelConfigs] = useState<TicketPanelConfig[]>([
    {
      id: 'panel-1',
      embed: {
        title: `${nexus_ticket} Nexus Support Ticket Panel`,
        description: 'Need assistance? Click one of the buttons below to open a direct support request with our server administration team.',
        color: '#5865F2',
        thumbnail: 'https://cdn.discordapp.com/icons/123456789012345678/NS.png',
        footer: 'NexusBot Support Automation System'
      },
      buttons: [
        { id: 'btn-1', name: 'General Support', emoji: nexus_ticket, categoryName: 'General Support', channelCategoryName: 'TICKETS (SUPPORT)' },
        { id: 'btn-2', name: 'Billing Issues', emoji: nexus_createticket, categoryName: 'Billing Support', channelCategoryName: 'BILLING-QUERIES' }
      ],
      targetChannelId: '1', // #create-a-ticket
      welcomeMessage: 'Welcome to your ticket! A staff member will be with you shortly. Please describe your issue in detail.'
    }
  ]);

  // Embed builder active edit element selection
  const [embedEditField, setEmbedEditField] = useState<'title' | 'description' | 'color' | 'thumbnail' | 'footer'>('title');

  // Currently constructing panel state (for /ticket setup)
  const [currentEmbed, setCurrentEmbed] = useState<EmbedConfig>({
    title: `${nexus_createticket} Nexus Help & Tickets`,
    description: 'Select an appropriate category below to contact staff directly regarding Server Issues, Partnerships, or General Inquiries.',
    color: '#34D399',
    thumbnail: '',
    footer: 'Nexus Security Guard Panel'
  });

  const [panelButtons, setPanelButtons] = useState<PanelButton[]>([
    { id: 'btn-init-1', name: 'Open Ticket', emoji: nexus_createticket, categoryName: 'Server Support', channelCategoryName: 'TICKETS (SUPPORT)' }
  ]);

  const [targetChannelId, setTargetChannelId] = useState<string>('1');
  const [welcomeMessage, setWelcomeMessage] = useState<string>(
    'Welcome {user}! Thank you for opening a support ticket. Our team has been notified and will assist you shortly. In the meantime, please explain your request.'
  );

  // Editing active configs state (for /ticket config)
  const [selectedConfigId, setSelectedConfigId] = useState<string>('panel-1');
  const [isEditingConfig, setIsEditingConfig] = useState<boolean>(false);

  // Modal State for adding button
  const [addButtonModalOpen, setAddButtonModalOpen] = useState<boolean>(false);
  const [newBtnName, setNewBtnName] = useState<string>('');
  const [newBtnCategory, setNewBtnCategory] = useState<string>('');
  const [newBtnEmoji, setNewBtnEmoji] = useState<string>(nexus_createticket);

  // Prompt category after adding button
  const [pendingButton, setPendingButton] = useState<PanelButton | null>(null);
  const [channelCategorySelectOpen, setChannelCategorySelectOpen] = useState<boolean>(false);
  const [selectedChannelCategory, setSelectedChannelCategory] = useState<string>('TICKETS (SUPPORT)');

  // Selected channel page for setup
  const [setupStep, setSetupStep] = useState<'builder' | 'channel_selection'>('builder');

  // Simulation State
  const [simulatedTickets, setSimulatedTickets] = useState<SimulatedTicket[]>([]);
  const [activeSimTicketId, setActiveSimTicketId] = useState<string | null>(null);
  const [simMessageText, setSimMessageText] = useState<string>('');
  const [ticketCounter, setTicketCounter] = useState<number>(1);

  // Custom Discord emojis options list
  const EMOJI_OPTIONS = [
    nexus_ticket,
    nexus_createticket,
    'nexus_ticket',
    'nexus_createticket'
  ];

  // Helper to extract clean display text from title that may include custom emoji tags
  const cleanTitle = (rawTitle: string) => {
    if (!rawTitle) return '';
    return rawTitle
      .replace(/<:nexus_ticket:\d+>/g, '')
      .replace(/<:nexus_createticket:\d+>/g, '')
      .replace(/nexus_ticket/g, '')
      .replace(/nexus_createticket/g, '')
      .replace(/[🎫✉️🛡️]/g, '')
      .trim();
  };

  // Handle opening modal for Add Button
  const handleOpenAddButton = () => {
    setNewBtnName('');
    setNewBtnCategory('');
    setNewBtnEmoji(nexus_createticket);
    setAddButtonModalOpen(true);
  };

  // Submit new button from modal
  const handleAddButtonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBtnName.trim() || !newBtnCategory.trim()) {
      triggerToast('Please fill in both the button name and ticket category description.');
      return;
    }

    const newBtn: PanelButton = {
      id: 'btn-' + Date.now(),
      name: newBtnName.trim(),
      emoji: newBtnEmoji,
      categoryName: newBtnCategory.trim()
    };

    setAddButtonModalOpen(false);
    // Proceed to Category Select Prompt
    setPendingButton(newBtn);
    setSelectedChannelCategory('TICKETS (SUPPORT)');
    setChannelCategorySelectOpen(true);
  };

  // Confirm category where ticket channels will be created
  const handleCategorySelectConfirm = () => {
    if (!pendingButton) return;

    const completedBtn: PanelButton = {
      ...pendingButton,
      channelCategoryName: selectedChannelCategory
    };

    setPanelButtons([...panelButtons, completedBtn]);
    setPendingButton(null);
    setChannelCategorySelectOpen(false);
    triggerToast(`Added "${completedBtn.name}" button, routed to ${selectedChannelCategory}`);
  };

  // Remove a button
  const handleRemoveButton = (btnId: string) => {
    setPanelButtons(panelButtons.filter(b => b.id !== btnId));
    triggerToast('Button removed from panel');
  };

  // Finish setup and deploy panel
  const handleDeployPanel = () => {
    if (panelButtons.length === 0) {
      triggerToast('Error: Please add at least one button to your ticket panel.');
      return;
    }

    const newConfig: TicketPanelConfig = {
      id: 'panel-' + Date.now(),
      embed: { ...currentEmbed },
      buttons: [...panelButtons],
      targetChannelId,
      welcomeMessage
    };

    setPanelConfigs([...panelConfigs, newConfig]);
    addAuditLog('TICKETS', 'SETUP_SUCCESS', `Created ticket panel "${newConfig.embed.title}" in #${DISCORD_CHANNELS.find(c => c.id === targetChannelId)?.name}`);
    triggerToast('Ticket setup completed! Panel successfully deployed.');
    
    // Switch to active simulation
    setActiveTab('simulation');
    setSetupStep('builder');
  };

  // Trigger creating a simulated ticket channel (button click in preview)
  const handleSimulateOpenTicket = (button: PanelButton, config: TicketPanelConfig) => {
    const num = ticketCounter;
    setTicketCounter(num + 1);
    
    const channelName = `${userName.toLowerCase().replace(/[^a-z0-9]/g, '')}-ticket-${num}`;
    const customWelcome = config.welcomeMessage.replace('{user}', userName);

    const newTicket: SimulatedTicket = {
      id: 'ticket-' + Date.now(),
      channelName,
      categoryName: button.channelCategoryName || 'TICKETS (SUPPORT)',
      creatorName: userName,
      status: 'open',
      welcomeMessage: customWelcome,
      messages: [
        {
          sender: 'system',
          senderName: 'SYSTEM LOG',
          text: `Ticket opened by user ${userName} via "${button.name}" panel.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
        {
          sender: 'bot',
          senderName: 'NexusBot',
          text: customWelcome,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
    };

    setSimulatedTickets([newTicket, ...simulatedTickets]);
    setActiveSimTicketId(newTicket.id);
    triggerToast(`Created simulated ticket #${channelName}`);
    setActiveTab('simulation');
  };

  // Handle action buttons inside a ticket (Claim, Close, Delete)
  const handleTicketAction = (ticketId: string, action: 'claim' | 'close' | 'delete') => {
    const ticket = simulatedTickets.find(t => t.id === ticketId);
    if (!ticket) return;

    let updatedTickets = [...simulatedTickets];
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (action === 'claim') {
      updatedTickets = simulatedTickets.map(t => {
        if (t.id === ticketId) {
          const newChannelName = t.channelName.startsWith('✅') ? t.channelName : `✅${t.channelName}`;
          return {
            ...t,
            channelName: newChannelName,
            status: 'claimed' as const,
            claimedBy: 'Moderator Alex',
            messages: [
              ...t.messages,
              {
                sender: 'moderator',
                senderName: 'Moderator Alex',
                text: 'Hello! I have claimed your ticket and will be assisting you shortly. How can I help?',
                time
              },
              {
                sender: 'system',
                senderName: 'SYSTEM',
                text: `Ticket claimed by Moderator Alex`,
                time
              }
            ]
          };
        }
        return t;
      });
      triggerToast('Ticket claimed by Moderator Alex');
    } else if (action === 'close') {
      updatedTickets = simulatedTickets.map(t => {
        if (t.id === ticketId) {
          return {
            ...t,
            status: 'closed' as const,
            messages: [
              ...t.messages,
              {
                sender: 'system',
                senderName: 'SYSTEM',
                text: `Ticket closed by Moderator Alex. Conversation is now archived.`,
                time
              }
            ]
          };
        }
        return t;
      });
      triggerToast('Ticket closed & archived');
    } else if (action === 'delete') {
      updatedTickets = simulatedTickets.filter(t => t.id !== ticketId);
      setActiveSimTicketId(null);
      triggerToast('Ticket deleted successfully');
    }

    setSimulatedTickets(updatedTickets);
  };

  // Sending simulated user message inside a ticket
  const handleSendSimMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simMessageText.trim() || !activeSimTicketId) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    setSimulatedTickets(simulatedTickets.map(t => {
      if (t.id === activeSimTicketId) {
        return {
          ...t,
          messages: [
            ...t.messages,
            {
              sender: 'user',
              senderName: userName,
              text: simMessageText.trim(),
              time
            }
          ]
        };
      }
      return t;
    }));

    setSimMessageText('');

    // Simulate auto bot reply if the ticket is open
    const ticket = simulatedTickets.find(t => t.id === activeSimTicketId);
    if (ticket && ticket.status === 'open') {
      setTimeout(() => {
        setSimulatedTickets(prev => prev.map(t => {
          if (t.id === activeSimTicketId) {
            return {
              ...t,
              messages: [
                ...t.messages,
                {
                  sender: 'bot',
                  senderName: 'NexusBot Support AI',
                  text: 'Auto-Response: Staff have been pinged. For faster service, please ensure you have provided relevant transaction IDs, logs, or server links!',
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
              ]
            };
          }
          return t;
        }));
      }, 1000);
    }
  };

  // Save changes to edited config
  const handleSaveConfigEdit = () => {
    setPanelConfigs(panelConfigs.map(c => {
      if (c.id === selectedConfigId) {
        return {
          ...c,
          embed: { ...currentEmbed },
          buttons: [...panelButtons],
          targetChannelId,
          welcomeMessage
        };
      }
      return c;
    }));

    setIsEditingConfig(false);
    setActiveTab('config');
    addAuditLog('TICKETS', 'CONFIG_EDIT', `Modified configuration for panel embed ID ${selectedConfigId}`);
    triggerToast('Successfully updated ticket configuration!');
  };

  const activeConfig = panelConfigs.find(c => c.id === selectedConfigId) || panelConfigs[0];

  return (
    <div className="flex flex-col xl:flex-row gap-6 w-full h-full min-h-[600px]">
      {/* LEFT COLUMN: ACTIVE INTERACTIVE WORKSPACE (SETUP, CONFIGS, OR CHAT) */}
      <div className="flex-1 bg-[#0f0f12] border border-white/5 rounded-2xl p-5 flex flex-col justify-between gap-5 shadow-xl">
        
        {/* HEADER BAR FOR SUBMENU */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                <DiscordEmoji name="nexus_ticket" sizeClassName="w-5 h-5" />
              </div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-display">
                Discord Help Desk & Ticket System
              </h2>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Build self-serve panels inside Discord where members can click buttons to open custom secure tickets.
            </p>
          </div>

          {/* Tab buttons representing `/ticket setup` and `/ticket config` and live simulated chats */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-white/5 shrink-0 text-xs font-semibold">
            <button
              onClick={() => {
                setIsEditingConfig(false);
                setActiveTab('setup');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'setup' && !isEditingConfig
                  ? 'bg-[#5865F2] text-white shadow font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              /ticket setup
            </button>
            <button
              onClick={() => {
                setActiveTab('config');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'config' || isEditingConfig
                  ? 'bg-[#5865F2] text-white shadow font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              /ticket config
            </button>
            <button
              onClick={() => setActiveTab('simulation')}
              className={`px-3 py-1.5 rounded-lg transition-all relative cursor-pointer ${
                activeTab === 'simulation'
                  ? 'bg-[#5865F2] text-white shadow font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Active Simulation</span>
              {simulatedTickets.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-[9px] text-black font-extrabold flex items-center justify-center animate-pulse">
                  {simulatedTickets.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* WORKSPACE AREA */}
        <div className="flex-1 min-h-[350px]">
          
          {/* TAB 1: SETUP WIZARD (/ticket setup) */}
          {activeTab === 'setup' && (
            <div className="space-y-5 h-full flex flex-col justify-between">
              {setupStep === 'builder' ? (
                <div className="space-y-5">
                  <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5 space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <DiscordEmoji name="nexus_createticket" sizeClassName="w-4 h-4" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-display block">
                          {isEditingConfig ? 'Editing Configured Embed Panel' : 'STEP 1: Construct Embed Panel'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold">
                        Interactive Builder
                      </span>
                    </div>

                    {/* SELECT DROPDOWN TO CHOOSE WHAT TO EDIT */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400">Select property to customize:</label>
                        <select
                          value={embedEditField}
                          onChange={(e: any) => setEmbedEditField(e.target.value)}
                          className="w-full bg-[#070709] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-[#5865F2] focus:outline-none"
                        >
                          <option value="title">Header Title</option>
                          <option value="description">Main Description Text</option>
                          <option value="color">Accent Color Strip</option>
                          <option value="thumbnail">Sidebar Icon Thumbnail</option>
                          <option value="footer">Bottom Footer text</option>
                        </select>
                      </div>

                      {/* EDIT INPUT ACCORDING TO SELECTION */}
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 capitalize">Edit {embedEditField}:</label>
                        
                        {embedEditField === 'color' ? (
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={currentEmbed.color}
                              onChange={(e) => setCurrentEmbed({ ...currentEmbed, color: e.target.value })}
                              className="w-10 h-8 rounded border border-white/10 bg-[#070709] cursor-pointer"
                            />
                            <input
                              type="text"
                              value={currentEmbed.color}
                              onChange={(e) => setCurrentEmbed({ ...currentEmbed, color: e.target.value })}
                              className="flex-1 bg-[#070709] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:border-[#5865F2] focus:outline-none font-mono"
                            />
                          </div>
                        ) : embedEditField === 'description' ? (
                          <textarea
                            value={currentEmbed.description}
                            onChange={(e) => setCurrentEmbed({ ...currentEmbed, description: e.target.value })}
                            rows={2}
                            placeholder="Embed main text..."
                            className="w-full bg-[#070709] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:border-[#5865F2] focus:outline-none"
                          />
                        ) : (
                          <input
                            type="text"
                            value={currentEmbed[embedEditField]}
                            onChange={(e) => setCurrentEmbed({ ...currentEmbed, [embedEditField]: e.target.value })}
                            placeholder={`Enter ${embedEditField}...`}
                            className="w-full bg-[#070709] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:border-[#5865F2] focus:outline-none"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ACTIVE PANEL BUTTONS LIST */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <DiscordEmoji name="nexus_ticket" sizeClassName="w-4 h-4" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-display block">
                            STEP 2: Configure Embed Panel Action Buttons
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">Each button will open a specific type of ticket</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenAddButton}
                        className="flex items-center gap-1.5 bg-[#5865F2] hover:bg-[#4752C4] text-white py-1.5 px-3 rounded-lg text-[11px] font-bold shadow hover:scale-102 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Button</span>
                      </button>
                    </div>

                    {panelButtons.length === 0 ? (
                      <div className="p-8 border border-dashed border-white/5 rounded-xl bg-slate-950/20 text-center text-xs text-slate-500">
                        No action buttons configured yet. Click "Add Button" to enable user interactions!
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {panelButtons.map((btn) => (
                          <div 
                            key={btn.id}
                            className="bg-slate-950/40 border border-white/5 rounded-xl p-3 flex justify-between items-center group hover:border-[#5865F2]/20 transition"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <DiscordEmoji name={btn.emoji} sizeClassName="w-5 h-5" />
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-slate-200 truncate">{btn.name}</h4>
                                <span className="text-[9px] text-slate-500 block font-mono uppercase tracking-wider truncate">
                                  Category: {btn.categoryName} ({btn.channelCategoryName || 'SUPPORT'})
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveButton(btn.id)}
                              className="p-1 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded transition shrink-0 cursor-pointer"
                              title="Delete button"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* EDIT THE WELCOME MESSAGE */}
                  <div className="space-y-1.5 bg-slate-950/20 p-4 border border-white/5 rounded-xl">
                    <div className="flex items-center gap-1.5">
                      <DiscordEmoji name="nexus_createticket" sizeClassName="w-4 h-4" />
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-display block">
                        STEP 3: Customize Ticket Welcome Message
                      </label>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      The intro welcome greeting sent immediately when a user clicks a button to open a ticket.
                    </p>
                    <textarea
                      value={welcomeMessage}
                      onChange={(e) => setWelcomeMessage(e.target.value)}
                      rows={2}
                      className="w-full bg-[#070709] border border-white/10 rounded-lg p-3 text-xs text-slate-200 focus:border-[#5865F2] focus:outline-none mt-2 font-sans"
                      placeholder="Welcome {user}! Support will be with you shortly..."
                    />
                    <span className="text-[9px] text-slate-500 font-mono">Tip: Use `{'{user}'}` to placeholder-resolve the ticket opener's Discord username automatically.</span>
                  </div>
                </div>
              ) : (
                /* STEP 4: TARGET CHANNEL FOR DISPATCHING PANEL */
                <div className="space-y-5 my-auto max-w-md mx-auto text-center py-6">
                  <div className="w-12 h-12 bg-indigo-500/10 text-[#5865F2] border border-[#5865F2]/20 rounded-full flex items-center justify-center mx-auto text-xl">
                    <Send className="w-5 h-5" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-white text-sm font-display uppercase tracking-wide">
                      Select Target Channel for Ticket Panel
                    </h3>
                    <p className="text-xs text-slate-400 leading-normal">
                      We will post the generated embeds and action buttons to the selected channel. Users will click this panel inside Discord to interact.
                    </p>
                  </div>

                  <div className="space-y-2 text-left bg-slate-950 p-5 rounded-xl border border-white/5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-display">Target channel:</label>
                    <select
                      value={targetChannelId}
                      onChange={(e) => setTargetChannelId(e.target.value)}
                      className="w-full bg-[#070709] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-[#5865F2] focus:outline-none"
                    >
                      {DISCORD_CHANNELS.map(c => (
                        <option key={c.id} value={c.id}>#{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setSetupStep('builder')}
                      className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg font-semibold text-xs border border-white/5 transition cursor-pointer"
                    >
                      Back to Editor
                    </button>
                    <button
                      type="button"
                      onClick={isEditingConfig ? handleSaveConfigEdit : handleDeployPanel}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-md transition cursor-pointer"
                    >
                      {isEditingConfig ? 'Save Changes' : 'Send & Deploy Panel'}
                    </button>
                  </div>
                </div>
              )}

              {/* FOOTER ACTION AREA FOR BUILDER STEP */}
              {setupStep === 'builder' && (
                <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                  <div className="text-[10px] text-slate-500 font-mono">
                    {panelButtons.length} panel buttons configured
                  </div>
                  <div className="flex gap-2">
                    {isEditingConfig && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingConfig(false);
                          setActiveTab('config');
                        }}
                        className="py-1.5 px-3 bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-400 rounded-lg font-semibold text-xs transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={isEditingConfig ? handleSaveConfigEdit : handleDeployPanel}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-4 rounded-lg text-xs font-bold shadow transition cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isEditingConfig ? 'Save Changes' : 'Deploy Panel in Channel'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ACTIVE CONFIGURATIONS (/ticket config) */}
          {activeTab === 'config' && (
            <div className="space-y-4 h-full flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-1.5">
                  <DiscordEmoji name="nexus_ticket" sizeClassName="w-4 h-4" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-display block">
                    Active Configured Ticket Panel Modules
                  </span>
                </div>

                {panelConfigs.length === 0 ? (
                  <div className="p-12 border border-dashed border-white/5 rounded-2xl bg-slate-950/20 text-center space-y-3">
                    <ShieldAlert className="w-8 h-8 text-indigo-400 mx-auto" />
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-300 text-sm">No Active Ticket Panels</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">There are no deployed interactive helpdesks in this server yet. Create one in /ticket setup!</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {panelConfigs.map((config) => (
                      <div 
                        key={config.id}
                        className="bg-slate-950/40 border border-white/5 rounded-xl p-4 flex flex-col justify-between gap-4 group hover:border-[#5865F2]/25 transition"
                      >
                        <div className="space-y-3.5">
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 font-bold text-slate-200 text-xs truncate">
                                <DiscordEmoji name="nexus_ticket" sizeClassName="w-3.5 h-3.5" />
                                <span className="truncate">{cleanTitle(config.embed.title)}</span>
                              </div>
                              <span className="text-[9px] text-[#5865F2] font-mono block mt-0.5">
                                Posted in #{DISCORD_CHANNELS.find(c => c.id === config.targetChannelId)?.name || 'unknown'}
                              </span>
                            </div>
                            <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                              Live
                            </span>
                          </div>

                          <div className="space-y-1 bg-black/30 p-2.5 rounded border border-white/5 text-[10px] text-slate-400">
                            <span className="text-slate-500 block uppercase font-mono font-bold tracking-wider text-[8px]">Welcome Prompt:</span>
                            <p className="line-clamp-2 italic">"{config.welcomeMessage}"</p>
                          </div>

                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {config.buttons.map(b => (
                              <span key={b.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-900 border border-white/5 rounded text-[9px] text-slate-300 font-mono">
                                <DiscordEmoji name={b.emoji} sizeClassName="w-3 h-3" />
                                <span>{b.name}</span>
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-white/5">
                          <button
                            onClick={() => {
                              setSelectedConfigId(config.id);
                              setCurrentEmbed({ ...config.embed });
                              setPanelButtons([...config.buttons]);
                              setTargetChannelId(config.targetChannelId);
                              setWelcomeMessage(config.welcomeMessage);
                              setIsEditingConfig(true);
                              setSetupStep('builder');
                              setActiveTab('setup');
                              triggerToast(`Editing configuration for "${cleanTitle(config.embed.title)}"`);
                            }}
                            className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded text-xs font-semibold border border-white/5 transition cursor-pointer"
                          >
                            Edit Embed
                          </button>
                          <button
                            onClick={() => {
                              setPanelConfigs(panelConfigs.filter(c => c.id !== config.id));
                              triggerToast('Deleted configuration panel module');
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded transition cursor-pointer"
                            title="Delete panel config"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: LIVE SIMULATED CHATS */}
          {activeTab === 'simulation' && (
            <div className="flex flex-col md:flex-row gap-4 h-full min-h-[350px]">
              {/* Ticket Channels List Sidebar */}
              <div className="w-full md:w-48 bg-slate-950/60 rounded-xl p-3 border border-white/5 space-y-2 shrink-0">
                <span className="text-[9px] font-bold text-slate-500 uppercase font-mono tracking-wider block px-1">
                  Active Ticket Channels ({simulatedTickets.length})
                </span>

                {simulatedTickets.length === 0 ? (
                  <div className="py-8 text-center text-[10px] text-slate-500 px-2 italic">
                    No active tickets. Open one by clicking a button in the Live Discord Panel on the right!
                  </div>
                ) : (
                  <div className="space-y-1">
                    {simulatedTickets.map((ticket) => (
                      <button
                        key={ticket.id}
                        onClick={() => setActiveSimTicketId(ticket.id)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition select-none cursor-pointer ${
                          activeSimTicketId === ticket.id
                            ? 'bg-[#5865F2]/20 text-white font-bold border border-[#5865F2]/30'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] block truncate font-mono text-slate-200">
                            # {ticket.channelName}
                          </span>
                          <span className="text-[8px] text-slate-500 block uppercase truncate font-mono tracking-wide">
                            {ticket.categoryName}
                          </span>
                        </div>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ml-1 ${
                          ticket.status === 'open' ? 'bg-amber-400' : ticket.status === 'claimed' ? 'bg-emerald-400' : 'bg-slate-600'
                        }`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Interactive Chat Window */}
              <div className="flex-1 bg-slate-950/60 rounded-xl border border-white/5 flex flex-col justify-between overflow-hidden min-h-[250px]">
                {activeSimTicketId ? (
                  (() => {
                    const activeTicket = simulatedTickets.find(t => t.id === activeSimTicketId);
                    if (!activeTicket) return null;

                    return (
                      <>
                        {/* Chat Header */}
                        <div className="p-3 bg-slate-950 border-b border-white/5 flex justify-between items-center">
                          <div className="min-w-0">
                            <h3 className="font-bold text-slate-200 text-xs truncate"># {activeTicket.channelName}</h3>
                            <span className="text-[8px] text-slate-500 uppercase font-mono tracking-wider">
                              Category: {activeTicket.categoryName}
                            </span>
                          </div>
                          
                          {/* Control actions */}
                          <div className="flex gap-1.5 shrink-0">
                            {activeTicket.status === 'open' && (
                              <button
                                onClick={() => handleTicketAction(activeTicket.id, 'claim')}
                                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-[9px] uppercase tracking-wide cursor-pointer transition shadow flex items-center gap-1"
                              >
                                <DiscordEmoji name="nexus_createticket" sizeClassName="w-3 h-3" />
                                <span>Claim Ticket</span>
                              </button>
                            )}
                            {activeTicket.status !== 'closed' && (
                              <button
                                onClick={() => handleTicketAction(activeTicket.id, 'close')}
                                className="px-2 py-1 bg-slate-900 border border-white/10 hover:bg-slate-800 text-slate-300 font-bold rounded text-[9px] uppercase tracking-wide cursor-pointer transition flex items-center gap-1"
                              >
                                <DiscordEmoji name="nexus_ticket" sizeClassName="w-3 h-3" />
                                <span>Close Ticket</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleTicketAction(activeTicket.id, 'delete')}
                              className="p-1 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded transition cursor-pointer"
                              title="Delete ticket channel"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Chat Messages Log */}
                        <div className="flex-1 p-3 overflow-y-auto space-y-3.5 max-h-[250px]">
                          {activeTicket.messages.map((msg, i) => (
                            <div key={i} className="flex gap-2.5 text-xs">
                              {msg.sender === 'bot' ? (
                                <div className="w-7 h-7 rounded bg-[#5865F2]/20 border border-[#5865F2]/30 flex items-center justify-center shrink-0">
                                  <DiscordEmoji name="nexus_createticket" sizeClassName="w-4 h-4" />
                                </div>
                              ) : msg.sender === 'moderator' ? (
                                <div className="w-7 h-7 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                  <DiscordEmoji name="nexus_ticket" sizeClassName="w-4 h-4" />
                                </div>
                              ) : msg.sender === 'system' ? (
                                <div className="w-7 h-7 rounded bg-slate-800 border border-white/10 flex items-center justify-center shrink-0">
                                  <DiscordEmoji name="nexus_ticket" sizeClassName="w-3.5 h-3.5" />
                                </div>
                              ) : (
                                <DiscordUserAvatar
                                  avatarUrl={discordUser?.avatarUrl}
                                  username={msg.senderName}
                                  sizeClassName="w-7 h-7"
                                />
                              )}
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="font-bold text-slate-200">{msg.senderName}</span>
                                  {msg.sender === 'bot' && (
                                    <span className="text-[8px] bg-[#5865F2] text-white px-1 rounded font-bold uppercase tracking-wider scale-90">BOT</span>
                                  )}
                                  <span className="text-[9px] text-slate-600 font-mono">{msg.time}</span>
                                </div>
                                <p className={`text-slate-400 break-words leading-relaxed ${msg.sender === 'system' ? 'italic font-mono text-[10px] text-slate-500' : ''}`}>{msg.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Input Footer */}
                        {activeTicket.status !== 'closed' ? (
                          <form onSubmit={handleSendSimMessage} className="p-2 border-t border-white/5 bg-slate-950 flex gap-2">
                            <input
                              type="text"
                              value={simMessageText}
                              onChange={(e) => setSimMessageText(e.target.value)}
                              placeholder="Type a message as the user..."
                              className="flex-1 bg-[#0c0c0e] border border-white/5 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#5865F2]"
                            />
                            <button
                              type="submit"
                              className="p-1.5 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg transition shrink-0 cursor-pointer"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </form>
                        ) : (
                          <div className="p-3 bg-slate-900/40 border-t border-white/5 text-center text-[10px] text-slate-500 italic">
                            This ticket has been locked and archived. You cannot send messages here.
                          </div>
                        )}
                      </>
                    );
                  })()
                ) : (
                  <div className="my-auto text-center p-6 space-y-2">
                    <MessageSquare className="w-6 h-6 text-slate-600 mx-auto" />
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-slate-400 text-xs uppercase">No Active ticket selected</h4>
                      <p className="text-[10px] text-slate-600 max-w-xs mx-auto">
                        Pick a ticket channel from the left sidebar or click a button on the Deployed Ticket panel on the right to simulate creating one!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* RIGHT COLUMN: LIVELIHOOD DISCORD INTERFACE PREVIEW */}
      <div className="w-full xl:w-[440px] flex flex-col gap-4 shrink-0">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-display px-1 flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <DiscordEmoji name="nexus_createticket" sizeClassName="w-3.5 h-3.5" />
            <span>Live Discord Simulator Preview</span>
          </div>
          <span className="text-[9px] font-mono bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20 font-bold">
            Realtime render
          </span>
        </div>

        {/* Discord Mock Window */}
        <div className="bg-[#2f3136] rounded-2xl border border-white/5 overflow-hidden flex flex-col shadow-2xl text-xs select-none">
          {/* Discord Guild Sidebar / Channel Header */}
          <div className="bg-[#202225] p-3 border-b border-black/30 flex justify-between items-center text-white">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-slate-400 text-sm">#</span>
              <span className="font-bold font-sans truncate text-[11px]">
                {activeTab === 'simulation' && activeSimTicketId
                  ? simulatedTickets.find(t => t.id === activeSimTicketId)?.channelName || 'create-a-ticket'
                  : DISCORD_CHANNELS.find(c => c.id === targetChannelId)?.name || 'create-a-ticket'}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-slate-400 text-xs shrink-0 font-mono">
              <span className="bg-[#2f3136] px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-300">DISCORD SCREEN</span>
            </div>
          </div>

          {/* Discord Server Stream Area */}
          <div className="p-4 bg-[#36393f] min-h-[350px] flex flex-col justify-end gap-4">
            
            {/* INCOMING CHAT SIMULATOR MESSAGE (THE EMBED PANEL PREVIEW) */}
            <div className="space-y-2">
              {/* Bot Author info */}
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-[#5865F2] text-white font-extrabold flex items-center justify-center text-xs shrink-0 select-none">
                  <DiscordEmoji name="nexus_ticket" sizeClassName="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="font-bold text-white text-xs">NexusBot</span>
                    <span className="text-[8px] bg-[#5865F2] text-white px-1 rounded font-bold uppercase tracking-wider scale-90">BOT</span>
                    <span className="text-[10px] text-slate-400 font-mono">Today at 12:00 PM</span>
                  </div>

                  {/* Render Panel embed content */}
                  <div 
                    className="border-l-4 rounded-r-lg p-3 bg-[#2f3136] space-y-3 shadow max-w-[360px]"
                    style={{ borderLeftColor: activeTab === 'setup' ? currentEmbed.color : activeConfig?.embed.color || '#5865F2' }}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-white text-xs leading-snug">
                          <DiscordEmoji name="nexus_ticket" sizeClassName="w-4 h-4" />
                          <span>{cleanTitle(activeTab === 'setup' ? currentEmbed.title : activeConfig?.embed.title)}</span>
                        </div>
                        <p className="text-[10px] text-slate-300 leading-normal whitespace-pre-wrap">
                          {activeTab === 'setup' ? currentEmbed.description : activeConfig?.embed.description}
                        </p>
                      </div>

                      {/* Thumbnail Image rendering if valid */}
                      {(activeTab === 'setup' ? currentEmbed.thumbnail : activeConfig?.embed.thumbnail) && (
                        <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-slate-800 border border-white/10">
                          <img 
                            src={activeTab === 'setup' ? currentEmbed.thumbnail : activeConfig?.embed.thumbnail} 
                            alt="thumb" 
                            className="w-full h-full object-cover" 
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="text-[8px] text-slate-400 font-mono uppercase tracking-wider border-t border-white/5 pt-1.5">
                      {activeTab === 'setup' ? currentEmbed.footer : activeConfig?.embed.footer}
                    </div>
                  </div>

                  {/* Deployed Buttons Render */}
                  <div className="flex flex-wrap gap-2 mt-2 max-w-[360px]">
                    {(activeTab === 'setup' ? panelButtons : activeConfig?.buttons || []).map((btn) => {
                      const isSetup = activeTab === 'setup';
                      return (
                        <button
                          key={btn.id}
                          onClick={() => {
                            if (isSetup) {
                              triggerToast('Notice: Buttons are static during setup wizard. Deploy first or use Active configs tab to trigger simulations!');
                            } else {
                              handleSimulateOpenTicket(btn, activeConfig);
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4f545c] hover:bg-[#686d73] text-white text-[10px] font-bold rounded shadow transition active:scale-95 cursor-pointer max-w-full"
                        >
                          <DiscordEmoji name={btn.emoji} sizeClassName="w-4 h-4" />
                          <span className="truncate">{btn.name}</span>
                        </button>
                      );
                    })}
                  </div>

                </div>
              </div>
            </div>

            {/* Simulated Info Card */}
            <div className="p-3 bg-black/20 rounded-xl border border-white/5 space-y-1.5 text-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-display">
                How to Simulate Tickets
              </span>
              <p className="text-[10px] text-slate-400 leading-normal">
                {activeTab === 'setup' ? (
                  "Currently in wizard step. Complete the setup to deploy or switch to the Config tab to click active panels, which spawns simulated ticket channels."
                ) : (
                  "Click any of the Grey action buttons on the bot message above! A private ticket channel will open immediately for you in the active simulation window."
                )}
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* MODAL overlay: Add Action Button with Custom Emojis */}
      <AnimatePresence>
        {addButtonModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.form
              onSubmit={handleAddButtonSubmit}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0f0f12] border border-[#5865F2]/20 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-bold text-white text-xs uppercase font-display tracking-wide">Add Ticket Trigger Button</h3>
                </div>
                <button 
                  type="button" 
                  onClick={() => setAddButtonModalOpen(false)} 
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Button Name */}
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-display block">Button Label Name:</label>
                <input
                  type="text"
                  required
                  value={newBtnName}
                  onChange={(e) => setNewBtnName(e.target.value)}
                  placeholder="e.g. Report Players, General Support"
                  className="w-full bg-[#0c0c0e] border border-white/5 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-[#5865F2] focus:outline-none"
                />
              </div>

              {/* Ticket Category/Purpose Description */}
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-display block">Category Name / Purpose:</label>
                <input
                  type="text"
                  required
                  value={newBtnCategory}
                  onChange={(e) => setNewBtnCategory(e.target.value)}
                  placeholder="e.g. Billing, Technical Issues"
                  className="w-full bg-[#0c0c0e] border border-white/5 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-[#5865F2] focus:outline-none"
                />
              </div>

              {/* Button Custom Emoji Selection */}
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-display block">Button Custom Emoji Icon:</label>
                <div className="flex flex-wrap gap-2 p-2.5 bg-slate-950 rounded-lg border border-white/5 justify-center">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewBtnEmoji(emoji)}
                      className={`h-9 px-2.5 rounded text-xs flex items-center gap-1.5 transition border cursor-pointer ${
                        newBtnEmoji === emoji
                          ? 'bg-[#5865F2]/20 border-[#5865F2] text-white font-bold'
                          : 'bg-transparent border-transparent hover:bg-white/[0.04] text-slate-300'
                      }`}
                    >
                      <DiscordEmoji name={emoji} sizeClassName="w-4 h-4" />
                      <span className="font-mono text-[10px]">
                        {emoji.includes('createticket') ? 'nexus_createticket' : 'nexus_ticket'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setAddButtonModalOpen(false)}
                  className="flex-1 py-2 bg-slate-900 border border-white/5 hover:bg-white/[0.01] text-slate-400 rounded-lg font-semibold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg font-bold font-display uppercase tracking-wide text-xs transition cursor-pointer shadow"
                >
                  Confirm Button
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* OVERLAY: SELECT CATEGORY FOR THE NEW CREATED BUTTON */}
      <AnimatePresence>
        {channelCategorySelectOpen && pendingButton && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0f0f12] border border-[#5865F2]/20 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl"
            >
              <div className="space-y-1.5 text-center">
                <div className="w-10 h-10 bg-indigo-500/10 text-[#5865F2] border border-[#5865F2]/20 rounded-full flex items-center justify-center mx-auto text-xl">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-xs uppercase font-display tracking-wide">Select Ticket Destination Category</h3>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Select the Discord channel category where tickets of type "{pendingButton.name}" will be automatically spawned.
                </p>
              </div>

              <div className="space-y-1 text-left bg-slate-950 p-4 rounded-xl border border-white/5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-display mb-1">
                  Channel Category:
                </label>
                <select
                  value={selectedChannelCategory}
                  onChange={(e) => setSelectedChannelCategory(e.target.value)}
                  className="w-full bg-[#0c0c0e] border border-white/5 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-[#5865F2] focus:outline-none"
                >
                  {DISCORD_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setPendingButton(null);
                    setChannelCategorySelectOpen(false);
                  }}
                  className="flex-1 py-2 bg-slate-900 border border-white/5 hover:bg-white/[0.01] text-slate-400 rounded-lg font-semibold text-xs transition cursor-pointer"
                >
                  Discard Button
                </button>
                <button
                  type="button"
                  onClick={handleCategorySelectConfirm}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold font-display uppercase tracking-wide text-xs transition cursor-pointer shadow"
                >
                  Confirm Routing
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
