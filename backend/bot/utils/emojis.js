/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// This file is dynamically updated by backend/bot/scripts/uploadEmojis.js
// Do not edit the mapping manually.

import { CUSTOM_EMOJIS, CUSTOM_EMOJI_IDS, getCustomEmoji, getCustomEmojiObject } from './customEmojis.js';

export const Emojis = {
  ...CUSTOM_EMOJI_IDS,
  "nexus_xmark": "1528976558813872288",
  "nexus_warn": "1528976556888690770",
  "nexus_user": "1528976554728863544",
  "nexus_unlock": "1528976552065237073",
  "nexus_timeout": "1528976550127603795",
  "nexus_shield": "1528976548609265684",
  "nexus_settings": "1528976546043216448",
  "nexus_raid": "1528976544158974023",
  "nexus_owner": "1528976542099705936",
  "nexus_nuke": "1528976540388298903",
  "nexus_lock": "1528976538408587345",
  "nexus_kick": "1528976536206573588",
  "nexus_command": "1528976534323335308",
  "nexus_checkmark": "1528976531257298954",
  "nexus_ban": "1528976529043204646",
  "nexus_automod": "1528976527113322566"
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
