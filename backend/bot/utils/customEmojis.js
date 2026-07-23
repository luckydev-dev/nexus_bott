/**
 * Custom Emojis Configuration
 */

export const CUSTOM_EMOJIS = {
  stcup: "<:stcup:1490999920142848134>",
  stcinf: "<:stcinf:1491000131527507989>",
  stcplayers: "<:stcplayers:1491000294954237963>",
  stcdown: "<:stcdown:1491003350173483099>",
  tick_icons: "<:tick_icons:1492357181415096502>",
  Icon_No: "<:Icon_No:1492358274735935689>",
  icons_clock: "<:icons_clock:1492359168768737361>",
  icons_help: "<:icons_help:1492359346284269630>",
  icons_info: "<:icons_info:1492359404253614200>",
  icons_server: "<:icons_server:1492359555022061690>",
  icons_refresh: "<:icons_refresh:1492360052667846736>",
  icons_date: "<:icons_date:1492360156472934464>",
  icons_join: "<:icons_join:1492360353625931786>",
  icons_leave: "<:icons_leave:1492360468680147080>",
  icons_owner: "<:icons_owner:1492360835862102187>",
  icons_user: "<:icons_user:1493290245309857932>",
  icons_bot: "<:icons_bot:1492362091263164547>",
  icons_id: "<:icons_id:1492362594860793866>",
  icons_welcome: "<:icons_welcome:1492362669775126609>",
  icons_money: "<:icons_money:1492362873823821905>",
  icons_on: "<:icons_on:1492362992279490610>",
  icons_off: "<:icons_off:1492363046520098836>",
  icons_announce: "<:icons_announce:1492363244466077787>",
  icons_warn: "<:icons_warn:1492363369745743983>",
  icons_warning: "<:icons_warning:1492363455229857822>",
  icons_ban: "<:icons_ban:1492363597039407306>",
  icons_kick: "<:icons_kick:1492363677519843448>",
  icons_mute: "<:icons_mute:1492363727528525884>",
  icons_timeout: "<:icons_timeout:1492363804225441925>",
  icons_lock: "<:icons_lock:1492363881140457474>",
  icons_unlock: "<:icons_unlock:1492363940049715200>",
  icons_ticket: "<:icons_ticket:1492364264462090322>",
  icons_star: "<:icons_star:1492367601278648420>",
  icons_channel: "<:icons_channel:1492367884431921183>",
  icons_notify: "<:icons_notify:1492368272761552986>",
  icons_message: "<:icons_message:1492368350813093958>",
  icons_invite: "<:icons_invite:1523698954108276766>",
  icons_support: "<:icons_support:1492368520141340916>",
  icons_plus: "<:icons_plus:1492368645832314960>",
  invite1: "<:invite1:1492368849255792702>",
  icons_giveaway: "<:icons_giveaway:1492369385317204187>",
  icons_menu: "<:icons_menu:1492369799777488897>",
  icons_command: "<:icons_command:1492369953352056939>",
  icons_wrench: "<:icons_wrench:1492370472279474297>",
  gear_icons: "<:gear_icons:1492370606698795068>",
  icons_heart: "<:icons_heart:1492371017728000039>",
  icons_trash: "<:icons_trash:1492371157297664081>",
  MekoTrash: "<:MekoTrash:1492371274389782559>",
  stats_1: "<:stats_1:1492372122616463532>",
  lightbulb: "<:lightbulb:1492372149044908122>",
  icons_arrow: "<:icons_arrow:1492373344626933821>",
  features_icons: "<:features_icons:1492373477490163864>",
  prize: "<:prize:1493913769880064020>",
  AC_aicon_prize: "<:AC_aicon_prize:1493913838628634685>",
  giveaway_icons: "<:giveaway_icons:1493913941787803668>",
  icons_play: "<:icons_play:1523696495235432628>",
  icons_pause: "<:icons_pause:1523696615095795732>",
  icons_back: "<:icons_back:1523697059167862784>",
  music_loop: "<:music_loop:1523697509745168408>",
  icons_queue: "<:icons_queue:1523697555727323190>",
  music_back: "<:music_back:1523697644159893661>",
  music_next: "<:music_next:1523697871260614727>",
  icons_musicstop: "<:icons_musicstop:1523698157689503774>",
  icons_music: "<:icons_music:1523698197321486619>",
  icons_repeat: "<:icons_repeat:1523698347234562229>",
  icons_wave: "<:icons_wave:1523699187609501747>",
  icons_coin: "<:icons_coin:1523699741379268774>",
  icons_voice: "<:icons_voice:1523700083894386830>",
  icons_calldisconnect: "<:icons_calldisconnect:1523700292129128482>",
  icons_slash: "<:icons_slash:1523700925926080572>",
  icons_no: "<:icons_no:1523887770727088240>",
  icons_yes: "<:icons_yes:1523888149468680345>"
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
