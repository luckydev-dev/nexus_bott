// nexus bot
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CUSTOM_EMOJIS, CUSTOM_EMOJI_IDS, getCustomEmoji, getCustomEmojiObject } from './customEmojis.js';

export const Emojis = {
  ...CUSTOM_EMOJI_IDS
};

/**
 * Returns the Discord-formatted emoji mention string.
 * @param {string} name The emoji name (e.g. 'nexus_tick')
 * @param {boolean} [animated=false] Whether the emoji is animated
 * @returns {string} The formatted emoji string or a plaintext fallback.
 */
export function getEmoji(name, animated = false) {
  const id = Emojis[name];
  if (!id) return `:${name}:`;
  return animated ? `<a:${name}:${id}>` : `<:${name}:${id}>`;
}

/**
 * Returns the emoji object { id, name, animated } or throws if not registered.
 */
export function get(name) {
  const id = Emojis[name];
  if (!id) {
    throw new Error(`Emoji ${name} not registered`);
  }
  return {
    id,
    name,
    animated: false
  };
}

/**
 * Returns the Discord-formatted emoji mention string.
 */
export function mention(name, animated = false) {
  return getEmoji(name, animated);
}

/**
 * Returns the emoji object { id, name, animated } or null if not registered.
 */
export function setEmojiObject(name) {
  const id = Emojis[name];
  if (!id) return null;
  return {
    id,
    name,
    animated: false
  };
}

