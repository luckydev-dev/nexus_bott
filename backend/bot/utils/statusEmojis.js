/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as emojis from './emojis.js';

const STATUS = {
  success: ['nexus_tick'],
  error: ['nexus_cross', 'nexus_error'],
  warning: ['nexus_warning', 'nexus_alert'],
  loading: ['nexus_loading', 'nexus_reload'],
  info: ['nexus_info', 'nexus_shield'],
  lock: ['nexus_lock'],
  unlock: ['nexus_unlock'],
  user: ['nexus_user', 'nexus_owner', 'nexus_admin'],
  timeout: ['nexus_timeout', 'nexus_clock'],
  settings: ['nexus_settings', 'nexus_setting'],
  shield: ['nexus_shield'],
  automod: ['nexus_automod'],
  raid: ['nexus_antiraid'],
  nuke: ['nexus_antinuke'],
  kick: ['nexus_kick', 'nexus_cross'],
  ban: ['nexus_ban', 'nexus_cross'],
  command: ['nexus_commands', 'nexus_slash'],
  owner: ['nexus_owner'],
  logs: ['nexus_logs'],
  channel: ['nexus_channel'],
  message: ['nexus_message'],
  trash: ['nexus_trash'],
  mention: ['nexus_info'],
  watch: ['nexus_clock'],
  arrowleft: ['nexus_arrowleft', 'nexus_previouspage'],
  arrowright: ['nexus_arrowright', 'nexus_nextpage'],
  firstpage: ['nexus_firstpage'],
  previouspage: ['nexus_previouspage', 'nexus_arrowleft'],
  nextpage: ['nexus_nextpage', 'nexus_arrowright'],
  lastpage: ['nexus_lastpage'],
  bot: ['nexus_settings', 'nexus_setting'],
  stats: ['nexus_stats'],
  date: ['nexus_date'],
  home: ['nexus_home'],
  money: ['nexus_info'],
  question: ['nexus_help'],
  help: ['nexus_help'],
  ticket: ['nexus_message'],
  giveaway: ['nexus_info'],
  star: ['nexus_info'],
  plus: ['nexus_tick'],
  music: ['nexus_info'],
  play: ['nexus_on'],
  pause: ['nexus_off'],
  repeat: ['nexus_reload'],
  queue: ['nexus_menu'],
  stop: ['nexus_cross'],
  voice: ['nexus_channel'],
  notify: ['nexus_alert'],
  announce: ['nexus_message'],
  welcome: ['nexus_join'],
  join: ['nexus_join'],
  leave: ['nexus_leave'],
  heart: ['nexus_info'],
  server: ['nexus_server'],
  clock: ['nexus_clock'],
  id: ['nexus_ID'],
  on: ['nexus_on'],
  off: ['nexus_off'],
  invite: ['nexus_link'],
  support: ['nexus_help'],
  prefix: ['nexus_prefix'],
  roles: ['nexus_roles'],
  admin: ['nexus_admin'],
  online: ['nexus_online'],
  idle: ['nexus_idle'],
  dnd: ['nexus_dnd'],
  offline: ['nexus_offline'],
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
