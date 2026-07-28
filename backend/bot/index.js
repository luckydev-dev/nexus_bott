/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Client, GatewayIntentBits, ActivityType } from 'discord.js';
import { commands } from './commands.js';
import { getCustomEmojiObject, getCustomEmoji } from './utils/customEmojis.js';

// Modular Event Handlers
import handleInteraction from './events/interactionCreate.js';
import handleMessage from './events/messageCreate.js';
import handleGuildMemberAdd from './events/guildMemberAdd.js';
import handleChannelDelete from './events/channelDelete.js';
import { handleGuildCreate } from './events/guildCreate.js';
import {
  handleRoleDelete,
  handleRoleCreate,
  handleChannelCreate,
  handleGuildBanAdd,
  handleGuildMemberRemove
} from './events/antiNukeHandlers.js';
import {
  handleChannelUpdate,
  handleRoleUpdate,
  handleGuildMemberUpdate,
  handleMessageDelete,
  handleMessageUpdate
} from './events/activityLogger.js';

// Re-export Storage Methods for external SDK access
export {
  ensureGuildStorage,
  getGuildSettings,
  saveGuildSettings,
  addGuildAudit,
  getGuildAudits,
  DATA_DIR
} from './storage.js';

/**
 * Create and initialize the Discord Client.
 */
export function initializeDiscordBot() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.log('[NexusBot SDK] DISCORD_BOT_TOKEN is missing. Bot module is running inside live Dashboard sandbox simulation.');
    return null;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildModeration,
      GatewayIntentBits.GuildInvites
    ]
  });

  client.once('ready', async () => {
    console.log(`[NexusBot Gateway] Logged in as ${client.user.tag}`);
    
    // Human-like rotating presence statuses with custom emojis
    const shieldEmoji = getCustomEmojiObject('nexus_shield');
    const antiraidEmoji = getCustomEmojiObject('nexus_antiraid');
    const automodEmoji = getCustomEmojiObject('nexus_automod');

    const presenceList = [
      { 
        name: 'custom', 
        type: ActivityType.Custom, 
        state: 'Keeping channels clean & safe', 
        ...(shieldEmoji ? { emoji: shieldEmoji } : {})
      },
      { 
        name: '/help • /automod • /antinuke', 
        type: ActivityType.Listening 
      },
      { 
        name: 'custom', 
        type: ActivityType.Custom, 
        state: 'Watching spam & raid attempts', 
        ...(antiraidEmoji ? { emoji: antiraidEmoji } : {})
      },
      { 
        name: 'Fastest Mod Action', 
        type: ActivityType.Competing 
      },
      { 
        name: 'custom', 
        type: ActivityType.Custom, 
        state: 'NexusBot Protection Active', 
        ...(automodEmoji ? { emoji: automodEmoji } : {})
      }
    ];

    let presenceIndex = 0;
    const updatePresence = () => {
      const p = presenceList[presenceIndex];
      client.user.setPresence({
        activities: [p],
        status: 'online'
      });
      presenceIndex = (presenceIndex + 1) % presenceList.length;
    };

    updatePresence();
    setInterval(updatePresence, 3 * 60 * 1000); // Rotate every 3 minutes
    
    // Register global interactions/slash commands on the bot client
    client.application.commands.set(commands)
      .then(() => console.log('[NexusBot Gateway] Successfully registered Slash commands globally.'))
      .catch(err => console.error('[NexusBot Gateway] Command registration failed', err));
  });

  // Bind Modular Event Listeners
  client.on('interactionCreate', async (interaction) => {
    try {
      await handleInteraction(interaction);
    } catch (err) {
      console.error('[NexusBot interactionCreate Event Error]', err);
    }
  });

  client.on('messageCreate', async (message) => {
    try {
      await handleMessage(message);
    } catch (err) {
      console.error('[NexusBot messageCreate Event Error]', err);
    }
  });

  client.on('guildCreate', async (guild) => {
    try {
      await handleGuildCreate(guild);
    } catch (err) {
      console.error('[NexusBot guildCreate Event Error]', err);
    }
  });

  client.on('guildMemberAdd', async (member) => {
    try {
      await handleGuildMemberAdd(member);
    } catch (err) {
      console.error('[NexusBot guildMemberAdd Event Error]', err);
    }
  });

  client.on('channelDelete', async (channel) => {
    try {
      await handleChannelDelete(channel);
    } catch (err) {
      console.error('[NexusBot channelDelete Event Error]', err);
    }
  });

  client.on('channelCreate', async (channel) => {
    try {
      await handleChannelCreate(channel);
    } catch (err) {
      console.error('[NexusBot channelCreate Event Error]', err);
    }
  });

  client.on('roleDelete', async (role) => {
    try {
      await handleRoleDelete(role);
    } catch (err) {
      console.error('[NexusBot roleDelete Event Error]', err);
    }
  });

  client.on('roleCreate', async (role) => {
    try {
      await handleRoleCreate(role);
    } catch (err) {
      console.error('[NexusBot roleCreate Event Error]', err);
    }
  });

  client.on('guildBanAdd', async (ban) => {
    try {
      await handleGuildBanAdd(ban);
    } catch (err) {
      console.error('[NexusBot guildBanAdd Event Error]', err);
    }
  });

  client.on('guildMemberRemove', async (member) => {
    try {
      await handleGuildMemberRemove(member);
    } catch (err) {
      console.error('[NexusBot guildMemberRemove Event Error]', err);
    }
  });

  client.on('channelUpdate', async (oldChannel, newChannel) => {
    try {
      await handleChannelUpdate(oldChannel, newChannel);
    } catch (err) {
      console.error('[NexusBot channelUpdate Event Error]', err);
    }
  });

  client.on('roleUpdate', async (oldRole, newRole) => {
    try {
      await handleRoleUpdate(oldRole, newRole);
    } catch (err) {
      console.error('[NexusBot roleUpdate Event Error]', err);
    }
  });

  client.on('guildMemberUpdate', async (oldMember, newMember) => {
    try {
      await handleGuildMemberUpdate(oldMember, newMember);
    } catch (err) {
      console.error('[NexusBot guildMemberUpdate Event Error]', err);
    }
  });

  client.on('messageDelete', async (message) => {
    try {
      await handleMessageDelete(message);
    } catch (err) {
      console.error('[NexusBot messageDelete Event Error]', err);
    }
  });

  client.on('messageUpdate', async (oldMessage, newMessage) => {
    try {
      await handleMessageUpdate(oldMessage, newMessage);
    } catch (err) {
      console.error('[NexusBot messageUpdate Event Error]', err);
    }
  });

  client.login(token).catch(err => {
    console.error('[NexusBot Gateway] Failed to log in with token.', err);
  });

  return client;
}
