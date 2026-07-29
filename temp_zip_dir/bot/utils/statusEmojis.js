/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as emojis from './emojis.js';

const STATUS = {
  success: ['nexus_checkmark', 'nexus_tick'],
  error: ['nexus_xmark', 'nexus_cross'],
  warning: ['nexus_warn'],
  loading: ['nexus_loading'],
  info: ['nexus_shield', 'nexus_info'],
  lock: ['nexus_lock'],
  unlock: ['nexus_unlock'],
  user: ['nexus_user'],
  timeout: ['nexus_timeout'],
  settings: ['nexus_settings'],
  shield: ['nexus_shield'],
  automod: ['nexus_automod'],
  raid: ['nexus_raid'],
  nuke: ['nexus_nuke'],
  kick: ['nexus_kick'],
  ban: ['nexus_ban'],
  command: ['nexus_command'],
  owner: ['nexus_owner'],
  logs: ['nexus_logs'],
  channel: ['nexus_channel'],
  message: ['nexus_message'],
  trash: ['nexus_trash'],
  mention: ['nexus_mention'],
  watch: ['nexus_watch'],
  arrowleft: ['nexus_arrowleft'],
  arrowright: ['nexus_arrowright'],
  bot: ['nexus_bot'],
  date: ['nexus_date'],
  home: ['nexus_home'],
  money: ['nexus_money'],
  question: ['nexus_questionmark'],
};

/**
 * Returns the Discord formatted emoji mention string or null if not loaded.
 * @param {string} key The semantic status key (e.g. 'success')
 * @returns {string|null}
 */
export function statusEmoji(key) {
  try {
    const candidates = STATUS[key];
    if (!candidates) {
      // If there's no mapping, check if the key itself is registered
      if (emojis.Emojis[key]) {
        return emojis.getEmoji(key);
      }
      return null;
    }

    for (const name of candidates) {
      if (emojis.Emojis[name]) {
        return emojis.getEmoji(name);
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Returns the emoji object { id, name, animated } for buttons/menus, or null if not loaded.
 * @param {string} key The semantic status key (e.g. 'success')
 * @returns {object|null}
 */
export function statusEmojiObject(key) {
  try {
    const candidates = STATUS[key];
    if (!candidates) {
      if (emojis.Emojis[key]) {
        return emojis.setEmojiObject(key);
      }
      return null;
    }

    for (const name of candidates) {
      if (emojis.Emojis[name]) {
        return emojis.setEmojiObject(name);
      }
    }
    return null;
  } catch {
    return null;
  }
}
