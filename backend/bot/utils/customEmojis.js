/**
 * Custom Emojis Configuration
 */

export const CUSTOM_EMOJIS = {
  nexus_lastpage: "<:nexus_lastpage:1531200935844380763>",
  nexus_nextpage: "<:nexus_nextpage:1531200981348519946>",
  nexus_previouspage: "<:nexus_previouspage:1531201039787884574>",
  nexus_firstpage: "<:nexus_firstpage:1531201075661508628>",
  nexus_download: "<:nexus_download:1530790991060009000>",
  nexus_online: "<:nexus_online:1530791030277013625>",
  nexus_dnd: "<:nexus_dnd:1530791069753675876>",
  nexus_offline: "<:nexus_offline:1530791107586293910>",
  nexus_idle: "<:nexus_idle:1530791137604796476>",
  nexus_roles: "<:nexus_roles:1530791175655657653>",
  nexus_emojis: "<:nexus_emojis:1530791225471271002>",
  nexus_leave: "<:nexus_leave:1531151245518045194>",
  nexus_join: "<:nexus_join:1531151389315694592>",
  nexus_reload: "<:nexus_reload:1530791464945188956>",
  nexus_off: "<:nexus_off:1530791510235418756>",
  nexus_on: "<:nexus_on:1530791552513867856>",
  nexus_loading: "<:nexus_loading:1530791599401865397>",
  nexus_admin: "<:nexus_admin:1530791632327147631>",
  nexus_tick: "<:nexus_tick:1530793594569494660>",
  nexus_cross: "<:nexus_cross:1530793636529311814>",
  nexus_channel: "<:nexus_channel:1530793673959407656>",
  nexus_shield: "<:nexus_shield:1530793732562227361>",
  nexus_message: "<:nexus_message:1530793769295806616>",
  nexus_antiraid: "<:nexus_antiraid:1530793818851643503>",
  nexus_antinuke: "<:nexus_antinuke:1530793871095758999>",
  nexus_automod: "<:nexus_automod:1530793907418566757>",
  nexus_logs: "<:nexus_logs:1531150136154128404>",
  nexus_link: "<:nexus_link:1531150175882449038>",
  nexus_commands: "<:nexus_commands:1531150219985817642>",
  nexus_prefix: "<:nexus_prefix:1531150260209061949>",
  nexus_unlock: "<:nexus_unlock:1531150308162666636>",
  nexus_lock: "<:nexus_lock:1531150355461701812>",
  nexus_info: "<:nexus_info:1531150395357794354>",
  nexus_clock: "<:nexus_clock:1531150456393302077>",
  nexus_date: "<:nexus_date:1531150512005845034>",
  nexus_help: "<:nexus_help:1531150624639549561>",
  nexus_alert: "<:nexus_alert:1531150666590982174>",
  nexus_warning: "<:nexus_warning:1531150732747866172>",
  nexus_error: "<:nexus_error:1531150772501221458>",
  nexus_menu: "<:nexus_menu:1531150839962538094>",
  nexus_settings: "<:nexus_settings:1531150893385515140>",
  nexus_setting: "<:nexus_settings:1531150893385515140>",
  nexus_slash: "<:nexus_slash:1531150938046464131>",
  nexus_trash: "<:nexus_trash:1531151012830904330>",
  nexus_server: "<:nexus_server:1531151051640799445>",
  nexus_ID: "<:nexus_ID:1531151109463478382>",
  nexus_arrowright: "<:nexus_arrowright:1531151160876994691>",
  nexus_arrowleft: "<:nexus_arrowleft:1531151196599881808>",
  nexus_owner: "<:nexus_owner:1531200508423962686>",
  nexus_home: "<:nexus_home:1531200550194909324>",
  nexus_user: "<:nexus_user:1531200622383075398>",
  nexus_stats: "<:nexus_stats:1531200663009366016>",
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

