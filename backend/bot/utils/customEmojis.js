/**
 * Custom Emojis Configuration
 */

export const CUSTOM_EMOJIS = {
  nexus_cross: "<:nexus_cross:1530192585836990545>",
  nexus_tick: "<:nexus_tick:1530192661343113346>",
  nexus_channel: "<:nexus_channel:1530192763813892196>",
  nexus_shield: "<:nexus_shield:1530193910490599525>",
  nexus_antinuke: "<:nexus_antinuke:1530193964911820860>",
  nexus_antiraid: "<:nexus_antiraid:1530194017512460339>",
  nexus_automod: "<:nexus_automod:1530194065759670354>",
  nexus_message: "<:nexus_message:1530194107908096031>",
  nexus_alert: "<:nexus_alert:1530195171130478653>",
  nexus_slash: "<:nexus_slash:1530196203294429344>",
  nexus_error: "<:nexus_error:1530196248643108964>",
  nexus_arrowleft: "<:nexus_arrowleft:1530196326917079070>",
  nexus_arrowright: "<:nexus_arrowright:1530196415425417357>",
  nexus_trash: "<:nexus_trash:1530196482639003679>",
  nexus_warning: "<:nexus_warning:1530196536770957422>",
  nexus_logs: "<:nexus_logs:1530196577279283230>",
  nexus_clock: "<:nexus_clock:1530401831396839546>",
  nexus_help: "<:nexus_help:1530401872576381029>",
  nexus_ID: "<:nexus_ID:1530401915706544188>",
  nexus_server: "<:nexus_server:1530401954805583902>",
  nexus_owner: "<:nexus_owner:1530402040168321157>",
  nexus_date: "<:nexus_date:1530402099748147300>",
  nexus_menu: "<:nexus_menu:1530402150843158648>",
  nexus_setting: "<:nexus_setting:1530402742034632956>",
  nexus_mute: "<:nexus_mute:1530436286870065302>",
  nexus_ban: "<:nexus_ban:1530436326825132082>",
  nexus_timeout: "<:nexus_timeout:1530436389022334986>",
  nexus_kick: "<:nexus_kick:1530436433343549480>",
  nexus_info: "<:nexus_info:1530740823598170212>",
  nexus_lock: "<:nexus_lock:1530740880439382166>",
  nexus_unlock: "<:nexus_unlock:1530740933203591328>",
  nexus_home: "<:nexus_home:1530740986559463454>",
  nexus_link: "<:nexus_link:1530741035641208912>",
  nexus_prefix: "<:nexus_prefix:1530741088577650749>",
  nexus_commands: "<:nexus_commands:1530741156684496916>",
  nexus_download: "<:nexus_download:1530780965222355086>",
  nexus_roles: "<:nexus_roles:1530781081261838497>",
  nexus_admin: "<:nexus_admin:1530781167589134396>",
  nexus_join: "<:nexus_join:1530781246550966303>",
  nexus_dnd: "<:nexus_dnd:1530781288015855677>",
  nexus_off: "<:nexus_off:1530781324183470211>",
  nexus_idle: "<:nexus_idle:1530781358228639844>",
  nexus_online: "<:nexus_online:1530781389815939204>",
  nexus_offline: "<:nexus_offline:1530781430202896546>",
  nexus_on: "<:nexus_on:1530781466802262128>",
  nexus_emojis: "<:nexus_emojis:1530781508372009152>",
  nexus_loading: "<:nexus_loading:1530781553959899187>",
  nexus_leave: "<:nexus_leave:1530781592472129668>",
  nexus_reload: "<:nexus_reload:1530781645412634725>",
};

export const CUSTOM_EMOJI_IDS = Object.fromEntries(
  Object.entries(CUSTOM_EMOJIS).map(([key, val]) => {
    const match = val.match(/:(\d+)>/);
    return [key, match ? match[1] : val];
  })
);

export function getCustomEmoji(key) {
  return CUSTOM_EMOJIS[key] || `:${key}:`;
}

export function getCustomEmojiObject(key) {
  const id = CUSTOM_EMOJI_IDS[key];
  if (!id) return null;
  return { id, name: key, animated: false };
}

