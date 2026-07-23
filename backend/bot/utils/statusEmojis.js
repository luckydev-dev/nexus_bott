/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as emojis from './emojis.js';

const STATUS = {
  success: ['icons_yes', 'tick_icons', 'nexus_checkmark', 'nexus_tick'],
  error: ['icons_no', 'Icon_No', 'nexus_xmark', 'nexus_cross'],
  warning: ['icons_warning', 'icons_warn', 'nexus_warn'],
  loading: ['icons_refresh', 'nexus_loading'],
  info: ['icons_info', 'stcinf', 'nexus_shield'],
  lock: ['icons_lock', 'nexus_lock'],
  unlock: ['icons_unlock', 'nexus_unlock'],
  user: ['icons_user', 'nexus_user'],
  timeout: ['icons_timeout', 'nexus_timeout'],
  settings: ['gear_icons', 'icons_wrench', 'nexus_settings'],
  shield: ['icons_info', 'stcinf', 'nexus_shield'],
  automod: ['icons_wrench', 'gear_icons', 'nexus_automod'],
  raid: ['icons_warning', 'stcdown', 'nexus_raid'],
  nuke: ['MekoTrash', 'icons_trash', 'nexus_nuke'],
  kick: ['icons_kick', 'nexus_kick'],
  ban: ['icons_ban', 'nexus_ban'],
  command: ['icons_command', 'icons_slash', 'nexus_command'],
  owner: ['icons_owner', 'nexus_owner'],
  logs: ['icons_message', 'nexus_logs'],
  channel: ['icons_channel', 'nexus_channel'],
  message: ['icons_message', 'nexus_message'],
  trash: ['icons_trash', 'MekoTrash', 'nexus_trash'],
  mention: ['icons_user', 'nexus_mention'],
  watch: ['icons_clock', 'nexus_watch'],
  arrowleft: ['icons_back', 'music_back', 'nexus_arrowleft'],
  arrowright: ['icons_arrow', 'music_next', 'nexus_arrowright'],
  bot: ['icons_bot', 'nexus_bot'],
  date: ['icons_date', 'nexus_date'],
  home: ['icons_server', 'nexus_home'],
  money: ['icons_money', 'icons_coin', 'nexus_money'],
  question: ['icons_help', 'nexus_questionmark'],
  help: ['icons_help'],
  ticket: ['icons_ticket'],
  giveaway: ['icons_giveaway', 'giveaway_icons', 'prize', 'AC_aicon_prize'],
  star: ['icons_star'],
  plus: ['icons_plus'],
  music: ['icons_music'],
  play: ['icons_play'],
  pause: ['icons_pause'],
  repeat: ['icons_repeat', 'music_loop'],
  queue: ['icons_queue'],
  stop: ['icons_musicstop'],
  voice: ['icons_voice'],
  notify: ['icons_notify'],
  announce: ['icons_announce'],
  welcome: ['icons_welcome'],
  join: ['icons_join'],
  leave: ['icons_leave'],
  heart: ['icons_heart'],
  server: ['icons_server'],
  clock: ['icons_clock'],
  id: ['icons_id'],
  on: ['icons_on'],
  off: ['icons_off'],
  invite: ['icons_invite', 'invite1'],
  support: ['icons_support'],
  players: ['stcplayers'],
  cup: ['stcup'],
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
