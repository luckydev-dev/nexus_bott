/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// In-memory cache for sniped messages
// Structure: channelId -> Array of sniped messages (ordered from newest to oldest)
const snipesCache = new Map();

const MAX_SNIPES_PER_CHANNEL = 20;

/**
 * Adds a deleted message to the in-memory snipe cache.
 * @param {string} channelId - The ID of the channel where the message was deleted.
 * @param {object} message - The deleted Discord message object.
 */
export function addSnipe(channelId, message) {
  if (!channelId || !message) return;

  // Don't snipe bot messages
  if (message.author?.bot) return;

  let channelSnipes = snipesCache.get(channelId) || [];

  const snipeData = {
    id: message.id,
    author: {
      id: message.author?.id || 'Unknown',
      username: message.author?.username || 'Unknown',
      tag: message.author?.tag || 'Unknown',
      displayAvatarURL: typeof message.author?.displayAvatarURL === 'function' 
        ? message.author.displayAvatarURL({ dynamic: true }) 
        : 'https://cdn.discordapp.com/embed/avatars/0.png'
    },
    channel: {
      id: message.channel.id,
      name: message.channel.name
    },
    content: message.content || '',
    attachments: message.attachments ? Array.from(message.attachments.values()).map(a => a.url) : [],
    deletedAt: new Date()
  };

  // Prepend to have the newest first
  channelSnipes.unshift(snipeData);

  // Limit cache size per channel
  if (channelSnipes.length > MAX_SNIPES_PER_CHANNEL) {
    channelSnipes = channelSnipes.slice(0, MAX_SNIPES_PER_CHANNEL);
  }

  snipesCache.set(channelId, channelSnipes);
}

/**
 * Retrieves the snipes for a specific channel.
 * @param {string} channelId - The channel ID.
 * @returns {Array} List of sniped messages.
 */
export function getSnipes(channelId) {
  return snipesCache.get(channelId) || [];
}

/**
 * Clears the snipes for a specific channel.
 * @param {string} channelId - The channel ID.
 */
export function clearSnipes(channelId) {
  snipesCache.delete(channelId);
}
