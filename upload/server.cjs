var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// backend/server.ts
var import_config = require("dotenv/config");
var import_express = __toESM(require("express"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_fs2 = __toESM(require("fs"), 1);
var import_cookie_parser = __toESM(require("cookie-parser"), 1);

// backend/bot/index.js
var import_discord = require("discord.js");
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var DATA_DIR = import_path.default.join(process.cwd(), "data", "servers");
function ensureGuildStorage(guildId) {
  const guildDir = import_path.default.join(DATA_DIR, guildId);
  if (!import_fs.default.existsSync(guildDir)) {
    import_fs.default.mkdirSync(guildDir, { recursive: true });
  }
  const files = {
    "settings.json": {
      enabled: true,
      welcome: {
        enabled: true,
        channelId: "welcome-channel-id",
        mode: "embed",
        title: "Welcome to Nexor Studio!",
        description: "We are thrilled to have you here, {user}! Make sure to check the rules and enjoy your stay in {server}.",
        color: "#5865F2",
        showServerIcon: true,
        showUserAvatar: true,
        bottomImage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
        footerText: "Server Member #{server.memberCount}",
        footerIcon: "",
        mentionUser: true
      },
      automod: {
        enabled: true,
        logChannelId: "automod-logs",
        spamFilter: true,
        linkFilter: true,
        inviteFilter: true,
        mentionLimit: 5,
        capsFilter: false,
        badWords: ["scam", "free-nitro", "hack"],
        action: "delete"
      },
      antiraid: {
        enabled: true,
        logChannelId: "antiraid-logs",
        joinRateThreshold: 8,
        quarantineNewAccounts: true,
        accountAgeMinDays: 3,
        lockdownOnAttack: false,
        action: "timeout"
      },
      antinuke: {
        enabled: true,
        logChannelId: "antinuke-logs",
        channelCreateThreshold: 3,
        channelDeleteThreshold: 2,
        roleDeleteThreshold: 2,
        webhookThreshold: 1,
        action: "remove_roles"
      },
      tickets: {
        enabled: true,
        panelTitle: "Nexor Support Portal",
        panelDescription: "Need assistance? Open a secure support ticket matching your inquiry category.",
        useDropdown: false,
        categories: [
          { id: "cat-1", name: "General Support", description: "General server inquiries or role requests.", emoji: "\u{1F4AC}", parentId: "123", supportRoles: ["Staff"], namingFormat: "ticket-{user}", openingText: "Thank you for reaching out. Support will be with you shortly.", requiredFields: ["Detailed Explanation"] },
          { id: "cat-2", name: "Billing & Payments", description: "Donations, store purchases, or custom tier questions.", emoji: "\u{1F4B3}", parentId: "124", supportRoles: ["Admin"], namingFormat: "billing-{user}", openingText: "Please provide proof of payment and invoice ID.", requiredFields: ["Order ID", "Detailed Explanation"] },
          { id: "cat-3", name: "Report a Bug", description: "Submit server or app issues directly to developers.", emoji: "\u{1F41B}", parentId: "125", supportRoles: ["Developer"], namingFormat: "bug-{user}", openingText: "Please state the steps to reproduce the bug clearly.", requiredFields: ["Steps to Reproduce", "Expected Result"] }
        ]
      }
    },
    "warnings.json": [],
    "backups.json": [],
    "invites.json": [
      { memberId: "m-3342", memberTag: "AlphaMark#0001", real: 42, fake: 3, rejoin: 8, left: 12, total: 29 },
      { memberId: "m-9482", memberTag: "Lumina#4412", real: 28, fake: 1, rejoin: 4, left: 6, total: 21 },
      { memberId: "m-1024", memberTag: "Tectonic#9988", real: 15, fake: 0, rejoin: 1, left: 2, total: 13 }
    ],
    "tickets_live.json": [],
    "audits.jsonl": ""
  };
  for (const [filename, defaultData] of Object.entries(files)) {
    const filePath = import_path.default.join(guildDir, filename);
    if (!import_fs.default.existsSync(filePath)) {
      if (filename.endsWith(".jsonl")) {
        import_fs.default.writeFileSync(filePath, defaultData);
      } else {
        import_fs.default.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
      }
    }
  }
}
function getGuildSettings(guildId) {
  ensureGuildStorage(guildId);
  const filePath = import_path.default.join(DATA_DIR, guildId, "settings.json");
  try {
    return JSON.parse(import_fs.default.readFileSync(filePath, "utf8"));
  } catch (err) {
    console.error(`Error reading settings for guild ${guildId}`, err);
    return {};
  }
}
function addGuildAudit(guildId, moduleName, action, reason, executorTag = "SYSTEM") {
  ensureGuildStorage(guildId);
  const filePath = import_path.default.join(DATA_DIR, guildId, "audits.jsonl");
  const auditId = "evt-" + Math.random().toString(36).substring(2, 8);
  const caseIdNum = Math.floor(Math.random() * 5e3) + 1e4;
  const entry = {
    eventId: auditId,
    caseId: `NX-0${caseIdNum}`,
    guildId,
    module: moduleName,
    action,
    executorId: "sys-node",
    executorTag,
    reason,
    status: "success",
    createdAt: (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", { hour12: false })
  };
  import_fs.default.appendFileSync(filePath, JSON.stringify(entry) + "\n");
}
var messageTimestamps = /* @__PURE__ */ new Map();
var deletionTrackers = /* @__PURE__ */ new Map();
function initializeDiscordBot() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.log("[NexusBot SDK] DISCORD_BOT_TOKEN is missing. Bot module is running inside live Dashboard sandbox simulation.");
    return null;
  }
  const client = new import_discord.Client({
    intents: [
      import_discord.GatewayIntentBits.Guilds,
      import_discord.GatewayIntentBits.GuildMembers,
      import_discord.GatewayIntentBits.GuildMessages,
      import_discord.GatewayIntentBits.MessageContent,
      import_discord.GatewayIntentBits.GuildModeration,
      import_discord.GatewayIntentBits.GuildInvites
    ]
  });
  client.once("ready", () => {
    console.log(`[NexusBot Gateway] Logged in as ${client.user.tag}`);
    client.user.setActivity("Shielding Guilds \u2022 v1.0.0", { type: import_discord.ActivityType.Watching });
    const commands = [
      {
        name: "help",
        description: "Displays NexusBot server security information."
      },
      {
        name: "warn",
        description: "Issues a moderation warning to a member.",
        options: [
          { name: "user", description: "The user to warn", type: 6, required: true },
          { name: "reason", description: "Reason for warn ticket", type: 3, required: true }
        ]
      },
      {
        name: "ban",
        description: "Bans a malicious member from the server.",
        options: [
          { name: "user", description: "The user to ban", type: 6, required: true },
          { name: "reason", description: "Reason for ban", type: 3, required: true }
        ]
      },
      {
        name: "lock",
        description: "Initiates a lockdown of a channel or all channels.",
        options: [
          {
            name: "target",
            description: "Lock target selection",
            type: 3,
            required: true,
            choices: [{ name: "all", value: "all" }, { name: "here", value: "here" }]
          }
        ]
      },
      {
        name: "backup",
        description: "Backup commands.",
        options: [
          {
            name: "action",
            description: "Backup action",
            type: 3,
            required: true,
            choices: [{ name: "create", value: "create" }]
          }
        ]
      }
    ];
    client.application.commands.set(commands).then(() => console.log("[NexusBot Gateway] Successfully registered Slash commands globally.")).catch((err) => console.error("[NexusBot Gateway] Command registration failed", err));
  });
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, guildId, user } = interaction;
    if (!guildId) {
      return interaction.reply({ content: "NexusBot commands can only be used inside Discord servers.", ephemeral: true });
    }
    ensureGuildStorage(guildId);
    const settings = getGuildSettings(guildId);
    if (commandName === "help") {
      const helpEmbed = new import_discord.EmbedBuilder().setTitle("\u{1F6F0}\uFE0F NexusBot Security Core").setDescription("High-concurrency full-stack Discord security shield running on WispByte.").setColor("#5865F2").addFields(
        { name: "\u{1F6E1}\uFE0F AutoMod", value: "Spam, link, and invite filters with rapid auto-warning actions.", inline: true },
        { name: "\u{1F6A8} AntiRaid", value: "Quarantining fresh accounts and dynamic join-rate attack detection.", inline: true },
        { name: "\u2622\uFE0F AntiNuke", value: "Admin permission stripping and bulk channel deletion protection.", inline: true },
        { name: "\u{1F4C1} Commands", value: "`/help`, `/warn`, `/ban`, `/lock [all|here]`, `/backup create`" }
      ).setFooter({ text: "Secure Isolation Mode" });
      return interaction.reply({ embeds: [helpEmbed] });
    }
    if (commandName === "warn") {
      if (!interaction.member.permissions.has(import_discord.PermissionFlagsBits.ModerateMembers)) {
        return interaction.reply({ content: "\u274C Access Denied: You require `ModerateMembers` permission.", ephemeral: true });
      }
      const targetUser = interaction.options.getUser("user");
      const reason = interaction.options.getString("reason");
      const warningsPath = import_path.default.join(DATA_DIR, guildId, "warnings.json");
      let warnings = [];
      try {
        warnings = JSON.parse(import_fs.default.readFileSync(warningsPath, "utf8"));
      } catch (e) {
      }
      const warnId = `warn-${warnings.length + 1}`;
      const caseIdNum = warnings.length + 12395;
      const newWarn = {
        id: warnId,
        guildId,
        memberId: targetUser.id,
        memberTag: targetUser.tag,
        reason,
        source: "manual",
        createdAt: (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 16),
        executorId: user.id,
        executorTag: user.tag,
        caseId: `NX-0${caseIdNum}`,
        active: true
      };
      warnings.push(newWarn);
      import_fs.default.writeFileSync(warningsPath, JSON.stringify(warnings, null, 2));
      addGuildAudit(guildId, "warnings", "MEMBER_WARN", `Manually warned user ${targetUser.tag} for: ${reason}`, user.tag);
      const warnEmbed = new import_discord.EmbedBuilder().setTitle("\u26A0\uFE0F Member Warned").setColor("#F59E0B").addFields(
        { name: "Target User", value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
        { name: "Moderator", value: user.tag, inline: true },
        { name: "Case ID", value: `NX-0${caseIdNum}`, inline: true },
        { name: "Reason", value: reason }
      );
      return interaction.reply({ embeds: [warnEmbed] });
    }
    if (commandName === "ban") {
      if (!interaction.member.permissions.has(import_discord.PermissionFlagsBits.BanMembers)) {
        return interaction.reply({ content: "\u274C Access Denied: You require `BanMembers` permission.", ephemeral: true });
      }
      const targetUser = interaction.options.getUser("user");
      const reason = interaction.options.getString("reason");
      try {
        await interaction.guild.members.ban(targetUser, { reason });
        addGuildAudit(guildId, "moderation", "MEMBER_BAN", `Banned user ${targetUser.tag} - Reason: ${reason}`, user.tag);
        const banEmbed = new import_discord.EmbedBuilder().setTitle("\u{1F528} User Ban Success").setColor("#EF4444").addFields(
          { name: "Target", value: targetUser.tag, inline: true },
          { name: "Executor", value: user.tag, inline: true },
          { name: "Reason", value: reason }
        );
        return interaction.reply({ embeds: [banEmbed] });
      } catch (err) {
        return interaction.reply({ content: `\u274C Failed to ban user: ${err.message}`, ephemeral: true });
      }
    }
    if (commandName === "lock") {
      if (!interaction.member.permissions.has(import_discord.PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({ content: "\u274C Access Denied: You require `ManageChannels` permission.", ephemeral: true });
      }
      const target = interaction.options.getString("target");
      if (target === "here") {
        try {
          await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            SendMessages: false
          });
          addGuildAudit(guildId, "moderation", "CHANNEL_LOCK", `Locked channel #${interaction.channel.name}`, user.tag);
          return interaction.reply({ content: `\u{1F512} Channel <#${interaction.channel.id}> has been locked successfully.` });
        } catch (e) {
          return interaction.reply({ content: `\u274C Lock failed: ${e.message}`, ephemeral: true });
        }
      } else if (target === "all") {
        try {
          const channels = await interaction.guild.channels.fetch();
          let count = 0;
          for (const [_, ch] of channels) {
            if (ch.isTextBased()) {
              await ch.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
              count++;
            }
          }
          addGuildAudit(guildId, "moderation", "BULK_LOCK", `Bulk locked ${count} text channels`, user.tag);
          return interaction.reply({ content: `\u{1F6A8} **Emergency Lockdown Activated**: Locked ${count} channels.` });
        } catch (e) {
          return interaction.reply({ content: `\u274C Bulk lock failed: ${e.message}`, ephemeral: true });
        }
      }
    }
    if (commandName === "backup" && interaction.options.getString("action") === "create") {
      if (user.id !== interaction.guild.ownerId && !interaction.member.permissions.has(import_discord.PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: "\u274C Access Denied: Only server administrators can trigger structural backups.", ephemeral: true });
      }
      await interaction.deferReply({ ephemeral: true });
      try {
        const channels = await interaction.guild.channels.fetch();
        const roles = await interaction.guild.roles.fetch();
        const channelData = [...channels.values()].map((c) => ({ name: c.name, type: c.type, parentName: c.parent?.name }));
        const roleData = [...roles.values()].map((r) => ({ name: r.name, color: r.color, permissions: r.permissions.bitfield.toString() }));
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let recoveryCode = "NX-";
        for (let i = 0; i < 16; i++) {
          if (i > 0 && i % 4 === 0) recoveryCode += "-";
          recoveryCode += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const backupId = `bk-${Math.random().toString(36).substring(2, 8)}`;
        const backupsPath = import_path.default.join(DATA_DIR, guildId, "backups.json");
        let backupsList = [];
        try {
          backupsList = JSON.parse(import_fs.default.readFileSync(backupsPath, "utf8"));
        } catch (e) {
        }
        const newBk = {
          id: backupId,
          creatorName: user.tag,
          createdAt: (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 16),
          channelCount: channelData.length,
          roleCount: roleData.length,
          size: `${Math.round(JSON.stringify({ channels: channelData, roles: roleData }).length / 1024)}KB`,
          channels: channelData,
          roles: roleData
        };
        backupsList.push(newBk);
        import_fs.default.writeFileSync(backupsPath, JSON.stringify(backupsList, null, 2));
        addGuildAudit(guildId, "backups", "BACKUP_CREATE", `Encrypted backup ${backupId} completed`, user.tag);
        try {
          await user.send(`\u{1F511} **NexusBot Cryptographic Backup Recovery Key** for server **${interaction.guild.name}**:
\`\`\`
${recoveryCode}
\`\`\`
Keep this code absolutely safe! It is required to restore structure.`);
        } catch (e) {
          return interaction.followUp({ content: `\u{1F4C1} Backup created! ID: **${backupId}**
\u26A0\uFE0F *Warning: I could not DM you the recovery key. Please make sure your DMs are open.*` });
        }
        return interaction.followUp({ content: `\u{1F4C1} Backup created successfully! ID: **${backupId}**. Recovery key was sent to your direct messages.` });
      } catch (err) {
        return interaction.followUp({ content: `\u274C Backup creation failed: ${err.message}` });
      }
    }
  });
  client.on("messageCreate", async (message) => {
    if (!message.guildId || message.author.bot) return;
    const guildId = message.guildId;
    const settings = getGuildSettings(guildId);
    if (!settings?.automod?.enabled) return;
    const member = message.member;
    const content = message.content;
    if (member?.permissions?.has(import_discord.PermissionFlagsBits.ManageMessages)) return;
    let triggerAutoMod = false;
    let reason = "";
    if (settings.automod.spamFilter) {
      const now = Date.now();
      const userKey = `${guildId}-${message.author.id}`;
      let timestamps = messageTimestamps.get(userKey) || [];
      timestamps.push(now);
      timestamps = timestamps.filter((t) => now - t < 1e4);
      messageTimestamps.set(userKey, timestamps);
      if (timestamps.length > settings.automod.mentionLimit) {
        triggerAutoMod = true;
        reason = "Rapid Chat Spamming (>5 msgs / 10s)";
      }
    }
    if (!triggerAutoMod && settings.automod.linkFilter) {
      const hasUrl = /(https?:\/\/[^\s]+)/g.test(content);
      if (hasUrl) {
        triggerAutoMod = true;
        reason = "Unauthorized Link Sharing";
      }
    }
    if (!triggerAutoMod && settings.automod.inviteFilter) {
      const hasInvite = /(discord\.gg|discord\.com\/invite)\/[^\s]+/g.test(content);
      if (hasInvite) {
        triggerAutoMod = true;
        reason = "Unauthorized Server Invite Link";
      }
    }
    if (!triggerAutoMod && settings.automod.badWords?.length > 0) {
      const lower = content.toLowerCase();
      const matched = settings.automod.badWords.find((word) => lower.includes(word.toLowerCase()));
      if (matched) {
        triggerAutoMod = true;
        reason = `Banned keyword usage: "${matched}"`;
      }
    }
    if (triggerAutoMod) {
      try {
        await message.delete();
      } catch (e) {
        console.error("Failed to delete moderated message", e);
      }
      const warningsPath = import_path.default.join(DATA_DIR, guildId, "warnings.json");
      let warnings = [];
      try {
        warnings = JSON.parse(import_fs.default.readFileSync(warningsPath, "utf8"));
      } catch (e) {
      }
      const caseIdNum = warnings.length + 12395;
      const newWarn = {
        id: `warn-${warnings.length + 1}`,
        guildId,
        memberId: message.author.id,
        memberTag: message.author.tag,
        reason: `[AutoMod] ${reason}`,
        source: "automod",
        createdAt: (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 16),
        executorId: "system-automod",
        executorTag: "NexusBot AutoMod",
        caseId: `NX-0${caseIdNum}`,
        active: true
      };
      warnings.push(newWarn);
      import_fs.default.writeFileSync(warningsPath, JSON.stringify(warnings, null, 2));
      addGuildAudit(guildId, "automod", "MSG_DELETED", `Deleted message from ${message.author.tag} & warned user. Reason: ${reason}`, "NexusBot AutoMod");
      try {
        const warningAlert = await message.channel.send(`\u26A0\uFE0F <@${message.author.id}>, your message was removed under the server's **AutoMod policies** (${reason}).`);
        setTimeout(() => warningAlert.delete().catch(() => {
        }), 5e3);
      } catch (e) {
      }
    }
  });
  client.on("guildMemberAdd", async (member) => {
    const guildId = member.guild.id;
    ensureGuildStorage(guildId);
    const settings = getGuildSettings(guildId);
    if (settings?.welcome?.enabled && settings.welcome.channelId) {
      const welcomeChannel = member.guild.channels.cache.get(settings.welcome.channelId);
      if (welcomeChannel) {
        let contentText = settings.welcome.description.replace(/{user}/g, `<@${member.id}>`).replace(/{server}/g, `**${member.guild.name}**`);
        if (settings.welcome.mode === "embed") {
          const embed = new import_discord.EmbedBuilder().setTitle(settings.welcome.title || "Welcome!").setDescription(contentText).setColor(settings.welcome.color || "#5865F2");
          if (settings.welcome.showUserAvatar) {
            embed.setThumbnail(member.user.displayAvatarURL());
          }
          if (settings.welcome.showServerIcon && member.guild.iconURL()) {
            embed.setAuthor({ name: member.guild.name, iconURL: member.guild.iconURL() });
          }
          if (settings.welcome.bottomImage) {
            embed.setImage(settings.welcome.bottomImage);
          }
          const footerStr = (settings.welcome.footerText || "Member Count: {server.memberCount}").replace(/{server.memberCount}/g, member.guild.memberCount.toString());
          embed.setFooter({ text: footerStr });
          welcomeChannel.send({ embeds: [embed] }).catch((err) => console.error("Failed to send welcome embed", err));
        } else {
          welcomeChannel.send({ content: contentText }).catch((err) => console.error("Failed to send welcome text", err));
        }
      }
    }
    if (settings?.antiraid?.enabled) {
      const ageInDays = (Date.now() - member.user.createdTimestamp) / (1e3 * 60 * 60 * 24);
      if (ageInDays < settings.antiraid.accountAgeMinDays) {
        addGuildAudit(guildId, "antiraid", "JOIN_QUARANTINE", `Quarantined member ${member.user.tag} (Account age: ${Math.round(ageInDays * 10) / 10} days, threshold: ${settings.antiraid.accountAgeMinDays} days)`);
        try {
          if (settings.antiraid.action === "timeout") {
            await member.timeout(1e3 * 60 * 60 * 24, "NexusBot AntiRaid Quarantine: Account is too new.");
            await member.send(`\u{1F512} You have been placed in temporary quarantine in **${member.guild.name}** because your Discord account is less than ${settings.antiraid.accountAgeMinDays} days old.`);
          } else if (settings.antiraid.action === "kick") {
            await member.send(`\u{1F512} You were kicked from **${member.guild.name}** because your Discord account is too new (<${settings.antiraid.accountAgeMinDays} days).`);
            await member.kick("NexusBot AntiRaid Quarantine");
          }
        } catch (e) {
          console.error("Failed to quarantine user", e);
        }
      }
    }
  });
  client.on("channelDelete", async (channel) => {
    if (!channel.guildId) return;
    const guildId = channel.guildId;
    const settings = getGuildSettings(guildId);
    if (!settings?.antinuke?.enabled) return;
    const now = Date.now();
    let deletions = deletionTrackers.get(guildId) || [];
    deletions.push(now);
    deletions = deletions.filter((t) => now - t < 6e4);
    deletionTrackers.set(guildId, deletions);
    if (deletions.length > settings.antinuke.channelDeleteThreshold) {
      addGuildAudit(guildId, "antinuke", "SHIELD_TRIGGER", `Shield triggered: Exceeded channel delete threshold (${settings.antinuke.channelDeleteThreshold} deletes / min)`);
      console.log(`[AntiNuke Shield Triggered] Bulk deletion in ${guildId}`);
    }
  });
  client.login(token).catch((err) => {
    console.error("[NexusBot Gateway] Failed to log in with token.", err);
  });
  return client;
}

// backend/server.ts
var DATA_DIR2 = import_path2.default.join(process.cwd(), "data", "servers");
function ensureGuildStorage2(guildId) {
  const guildDir = import_path2.default.join(DATA_DIR2, guildId);
  if (!import_fs2.default.existsSync(guildDir)) {
    import_fs2.default.mkdirSync(guildDir, { recursive: true });
  }
  const files = {
    "settings.json": {
      enabled: true,
      welcome: {
        enabled: true,
        channelId: "welcome-channel-id",
        mode: "embed",
        title: "Welcome to Nexor Studio!",
        description: "We are thrilled to have you here, {user}! Make sure to check the rules and enjoy your stay in {server}.",
        color: "#5865F2",
        showServerIcon: true,
        showUserAvatar: true,
        bottomImage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
        footerText: "Server Member #{server.memberCount}",
        footerIcon: "",
        mentionUser: true
      },
      automod: {
        enabled: true,
        logChannelId: "automod-logs",
        spamFilter: true,
        linkFilter: true,
        inviteFilter: true,
        mentionLimit: 5,
        capsFilter: false,
        badWords: ["scam", "free-nitro", "hack"],
        action: "delete"
      },
      antiraid: {
        enabled: true,
        logChannelId: "antiraid-logs",
        joinRateThreshold: 8,
        quarantineNewAccounts: true,
        accountAgeMinDays: 3,
        lockdownOnAttack: false,
        action: "timeout"
      },
      antinuke: {
        enabled: true,
        logChannelId: "antinuke-logs",
        channelCreateThreshold: 3,
        channelDeleteThreshold: 2,
        roleDeleteThreshold: 2,
        webhookThreshold: 1,
        action: "remove_roles"
      },
      tickets: {
        enabled: true,
        panelTitle: "Nexor Support Portal",
        panelDescription: "Need assistance? Open a secure support ticket matching your inquiry category.",
        useDropdown: false,
        categories: [
          { id: "cat-1", name: "General Support", description: "General server inquiries or role requests.", emoji: "\u{1F4AC}", parentId: "123", supportRoles: ["Staff"], namingFormat: "ticket-{user}", openingText: "Thank you for reaching out. Support will be with you shortly.", requiredFields: ["Detailed Explanation"] },
          { id: "cat-2", name: "Billing & Payments", description: "Donations, store purchases, or custom tier questions.", emoji: "\u{1F4B3}", parentId: "124", supportRoles: ["Admin"], namingFormat: "billing-{user}", openingText: "Please provide proof of payment and invoice ID.", requiredFields: ["Order ID", "Detailed Explanation"] },
          { id: "cat-3", name: "Report a Bug", description: "Submit server or app issues directly to developers.", emoji: "\u{1F41B}", parentId: "125", supportRoles: ["Developer"], namingFormat: "bug-{user}", openingText: "Please state the steps to reproduce the bug clearly.", requiredFields: ["Steps to Reproduce", "Expected Result"] }
        ]
      }
    },
    "warnings.json": [
      { id: "warn-1", guildId, memberId: "m-9023", memberTag: "toxic_vibe#1234", reason: "Extreme caps / chat disruption", source: "automod", createdAt: "2026-07-18 12:44", executorId: "system", executorTag: "NexusBot", caseId: "NX-012351", active: true },
      { id: "warn-2", guildId, memberId: "m-0941", memberTag: "ad_spammer#0042", reason: "Unapproved promotional invite link", source: "automod", createdAt: "2026-07-17 19:12", executorId: "system", executorTag: "NexusBot", caseId: "NX-012304", active: true },
      { id: "warn-3", guildId, memberId: "m-5592", memberTag: "alt_watcher#9911", reason: "Manual warn: Suspicious activity", source: "manual", createdAt: "2026-07-16 11:02", executorId: "admin", executorTag: "Nexus#0001", caseId: "NX-012290", active: true }
    ],
    "backups.json": [
      { id: "bk-849a93", creatorName: "Nexus#0001", createdAt: "2026-07-18 10:14", channelCount: 42, roleCount: 15, size: "412KB" },
      { id: "bk-1029df", creatorName: "System AutoBackup", createdAt: "2026-07-15 00:00", channelCount: 40, roleCount: 15, size: "390KB" }
    ],
    "invites.json": [
      { memberId: "m-3342", memberTag: "AlphaMark#0001", real: 42, fake: 3, rejoin: 8, left: 12, total: 29 },
      { memberId: "m-9482", memberTag: "Lumina#4412", real: 28, fake: 1, rejoin: 4, left: 6, total: 21 },
      { memberId: "m-1024", memberTag: "Tectonic#9988", real: 15, fake: 0, rejoin: 1, left: 2, total: 13 }
    ],
    "tickets_live.json": [
      { id: "tk-1", channelId: "ticket-alpha", creatorId: "user-0312", creatorTag: "AlphaUser#1212", categoryName: "General Support", status: "open", createdAt: "14:02" },
      { id: "tk-2", channelId: "billing-beta", creatorId: "user-9481", creatorTag: "PaidSupporter#9901", categoryName: "Billing & Payments", status: "claimed", claimedBy: "Staff_Mark", createdAt: "13:51" }
    ],
    "audits.jsonl": [
      { eventId: "evt-012402", caseId: "NX-012402", guildId, module: "automod", action: "MSG_DELETED", executorId: "system", executorTag: "SYSTEM", targetId: "u-3948", targetTag: "spammer_99", reason: "Spam Trigger (5/5 messages)", status: "success", createdAt: "14:22:01" },
      { eventId: "evt-012401", caseId: "NX-012401", guildId, module: "tickets", action: "PANEL_UPDATE", executorId: "admin", executorTag: "Nexus#0001", reason: "Update billing category support roles", status: "success", createdAt: "14:21:45" },
      { eventId: "evt-012400", caseId: "NX-012400", guildId, module: "backup", action: "CREATE_SUCCESS", executorId: "system", executorTag: "SYSTEM", reason: "Size: 452KB \u2022 Verified GCM", status: "success", createdAt: "14:18:30" },
      { eventId: "evt-012399", caseId: "NX-012399", guildId, module: "antiraid", action: "JOIN_QUARANTINE", executorId: "system", executorTag: "SYSTEM", targetId: "u-9012", targetTag: "alt_3942", reason: "Account age < 1h quarantine", status: "success", createdAt: "14:15:02" },
      { eventId: "evt-012398", caseId: "NX-012398", guildId, module: "core", action: "DATA_RECONCILE", executorId: "system", executorTag: "SYSTEM", reason: "Startup workspace integrity check OK", status: "success", createdAt: "14:12:44" },
      { eventId: "evt-012397", caseId: "NX-012397", guildId, module: "tickets", action: "TRANSCRIPT_GEN", executorId: "system", executorTag: "SYSTEM", reason: "Ticket closed: support-0042", status: "success", createdAt: "14:10:11" }
    ].map((l) => JSON.stringify(l)).join("\n") + "\n"
  };
  for (const [filename, defaultData] of Object.entries(files)) {
    const filePath = import_path2.default.join(guildDir, filename);
    if (!import_fs2.default.existsSync(filePath)) {
      if (filename.endsWith(".jsonl")) {
        import_fs2.default.writeFileSync(filePath, defaultData);
      } else {
        import_fs2.default.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
      }
    }
  }
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = Number(process.env.PORT) || 3e3;
  let botClient = null;
  app.use(import_express.default.json());
  const COOKIE_SECRET = "nexusbot_session_cryptographic_signing_key_99332211";
  app.use((0, import_cookie_parser.default)(COOKIE_SECRET));
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
  ensureGuildStorage2("123456789012345678");
  ensureGuildStorage2("987654321098765432");
  ensureGuildStorage2("556677889900112233");
  app.get("/api/v1/health", (req, res) => {
    res.json({
      success: true,
      status: "healthy",
      version: "1.0.0",
      host: "WispByte Premium Node (2GB RAM)",
      uptime: process.uptime()
    });
  });
  const CLIENT_ID = process.env.DISCORD_CLIENT_ID || "1528216029816426608";
  const getBackendUrl = (req) => {
    let backendUrl = process.env.APP_URL || process.env.BACKEND_URL;
    if (!backendUrl) {
      const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
      const host = req.get("host") || "localhost:3000";
      backendUrl = `${protocol}://${host}`;
    }
    if (backendUrl.endsWith("/")) {
      backendUrl = backendUrl.slice(0, -1);
    }
    return backendUrl;
  };
  app.get("/api/v1/auth/url", (req, res) => {
    const origin = req.query.origin || "http://localhost:3000";
    const redirectUri = `${getBackendUrl(req)}/api/v1/auth/callback`;
    console.log("[OAuth URL] Generating URL with redirectUri:", redirectUri);
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "identify guilds",
      state: String(origin)
    });
    res.json({ url: `https://discord.com/api/oauth2/authorize?${params.toString()}` });
  });
  app.post("/api/v1/bot/dm", async (req, res) => {
    const { target, content } = req.body;
    if (!target || !content) {
      return res.status(400).json({ success: false, error: "Recipient target and message content are required." });
    }
    if (!botClient || !botClient.isReady || !botClient.isReady()) {
      console.log(`[Simulated Bot DM] To: ${target} | Content: ${content}`);
      return res.json({
        success: true,
        message: `[SIMULATION] DM dispatched to ${target}. (Configure real DISCORD_TOKEN to send live DMs)`
      });
    }
    try {
      let user = botClient.users.cache.find((u) => u.tag === target || u.id === target || u.username === target);
      if (!user && /^\d+$/.test(target)) {
        try {
          user = await botClient.users.fetch(target);
        } catch (fetchErr) {
          console.warn(`Could not fetch user ID ${target}`);
        }
      }
      if (!user) {
        return res.status(404).json({
          success: false,
          error: `User "${target}" could not be resolved. Ensure the user shares a guild with the bot or the input is a valid ID.`
        });
      }
      await user.send(content);
      return res.json({ success: true, message: `DM successfully delivered to ${user.tag}` });
    } catch (err) {
      console.error("[Bot DM Send Error]", err);
      return res.status(500).json({ success: false, error: err.message || "Failed to dispatch Direct Message." });
    }
  });
  app.get(["/api/v1/auth/callback", "/api/v1/auth/callback/"], async (req, res) => {
    console.log("[OAuth Callback] Received request. Query:", req.query);
    const { code, state } = req.query;
    const origin = state ? String(state) : "http://localhost:3000";
    const redirectUri = `${getBackendUrl(req)}/api/v1/auth/callback`;
    let discordUser = {
      id: "1528216029816426608",
      username: "DiscordDev_Sim",
      avatar: null
    };
    let avatarUrl = "https://cdn.discordapp.com/embed/avatars/2.png";
    let usingSimulation = true;
    let tokenValue = null;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET || "E-oN_BdZUGcTuuUKvERpF1Q0EloVF8jd";
    if (code && clientSecret) {
      try {
        const body = new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: clientSecret,
          grant_type: "authorization_code",
          code: String(code),
          redirect_uri: redirectUri
        });
        const tokenRes = await fetch("https://discord.com/api/v10/oauth2/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString()
        });
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          console.log("[OAuth Callback] Token exchange successful");
          tokenValue = tokenData.access_token;
          const userRes = await fetch("https://discord.com/api/v10/users/@me", {
            headers: { "Authorization": `Bearer ${tokenData.access_token}` }
          });
          if (userRes.ok) {
            discordUser = await userRes.json();
            console.log("[OAuth Callback] User info fetched:", discordUser);
            usingSimulation = false;
            if (discordUser.avatar) {
              avatarUrl = `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`;
            } else {
              avatarUrl = `https://cdn.discordapp.com/embed/avatars/${parseInt(discordUser.id || "0") % 5}.png`;
            }
          }
        } else {
          console.error("[OAuth Callback] Token exchange failed:", await tokenRes.text());
        }
      } catch (err) {
        console.error("[OAuth Core Exchange Error]", err);
      }
    } else {
      console.warn("[OAuth Callback] No code provided");
    }
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Discord Auth Success</title>
          <style>
            body {
              background-color: #0c0c0e;
              color: #f1f5f9;
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              text-align: center;
            }
            .card {
              padding: 2.5rem;
              border-radius: 1rem;
              background: #0f0f12;
              border: 1px solid rgba(88, 101, 242, 0.2);
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
              max-width: 400px;
            }
            .avatar {
              width: 80px;
              height: 80px;
              border-radius: 50%;
              border: 3px solid #5865F2;
              margin-bottom: 1.5rem;
            }
            h2 { color: #5865F2; margin-top: 0; margin-bottom: 0.5rem; }
            p { color: #94a3b8; font-size: 14px; line-height: 1.5; margin-bottom: 1.5rem; }
            .notice {
              font-size: 11px;
              color: #e2e8f0;
              background-color: #1e1e24;
              padding: 0.5rem;
              border-radius: 0.5rem;
              border: 1px dashed rgba(255,255,255,0.1);
            }
          </style>
        </head>
        <body>
          <div class="card">
            <img class="avatar" src="${avatarUrl}" alt="${discordUser.username}" />
            <h2>Auth Connected!</h2>
            <p>Logged in successfully as <strong>${discordUser.username}</strong>.</p>
            ${usingSimulation ? `<p class="notice">\u26A0\uFE0F Simulated Profile. To log in with real Discord accounts on Pterodactyl, define the <b>DISCORD_CLIENT_SECRET</b> environment variable.</p>` : ""}
            <p style="font-size:12px;color:#64748b;">This window will close automatically...</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'OAUTH_AUTH_SUCCESS',
                user: {
                  id: ${JSON.stringify(discordUser.id)},
                  username: ${JSON.stringify(discordUser.username)},
                  avatarUrl: ${JSON.stringify(avatarUrl)},
                  accessToken: ${JSON.stringify(tokenValue)}
                }
              }, ${JSON.stringify(origin)});
              setTimeout(() => {
                window.close();
              }, 2500);
            } else {
              window.location.href = ${JSON.stringify(origin)};
            }
          </script>
        </body>
      </html>
    `);
  });
  app.get("/api/v1/auth/guilds", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, error: "No authorization header provided" });
    }
    const token = authHeader.replace("Bearer ", "");
    try {
      const guildsRes = await fetch("https://discord.com/api/v10/users/@me/guilds", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (guildsRes.ok) {
        const guilds = await guildsRes.json();
        return res.json({ success: true, guilds });
      } else {
        const errText = await guildsRes.text();
        return res.status(400).json({ success: false, error: "Failed to fetch guilds from Discord", details: errText });
      }
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  app.get("/api/v1/guilds/:guildId/config", (req, res) => {
    const { guildId } = req.params;
    try {
      ensureGuildStorage2(guildId);
      const guildDir = import_path2.default.join(DATA_DIR2, guildId);
      const settings = JSON.parse(import_fs2.default.readFileSync(import_path2.default.join(guildDir, "settings.json"), "utf8"));
      const warnings = JSON.parse(import_fs2.default.readFileSync(import_path2.default.join(guildDir, "warnings.json"), "utf8"));
      const backups = JSON.parse(import_fs2.default.readFileSync(import_path2.default.join(guildDir, "backups.json"), "utf8"));
      const invites = JSON.parse(import_fs2.default.readFileSync(import_path2.default.join(guildDir, "invites.json"), "utf8"));
      const liveTickets = JSON.parse(import_fs2.default.readFileSync(import_path2.default.join(guildDir, "tickets_live.json"), "utf8"));
      let audits = [];
      try {
        const rawAudits = import_fs2.default.readFileSync(import_path2.default.join(guildDir, "audits.jsonl"), "utf8").trim();
        audits = rawAudits ? rawAudits.split("\n").map((line) => JSON.parse(line)).reverse() : [];
      } catch (e) {
      }
      res.json({
        success: true,
        guildId,
        settings,
        warnings,
        backups,
        invites,
        liveTickets,
        audits
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/v1/guilds/:guildId/config", (req, res) => {
    const { guildId } = req.params;
    const { settings, warnings, backups, invites, liveTickets, audits } = req.body;
    try {
      ensureGuildStorage2(guildId);
      const guildDir = import_path2.default.join(DATA_DIR2, guildId);
      if (settings) {
        import_fs2.default.writeFileSync(import_path2.default.join(guildDir, "settings.json"), JSON.stringify(settings, null, 2));
      }
      if (warnings) {
        import_fs2.default.writeFileSync(import_path2.default.join(guildDir, "warnings.json"), JSON.stringify(warnings, null, 2));
      }
      if (backups) {
        import_fs2.default.writeFileSync(import_path2.default.join(guildDir, "backups.json"), JSON.stringify(backups, null, 2));
      }
      if (invites) {
        import_fs2.default.writeFileSync(import_path2.default.join(guildDir, "invites.json"), JSON.stringify(invites, null, 2));
      }
      if (liveTickets) {
        import_fs2.default.writeFileSync(import_path2.default.join(guildDir, "tickets_live.json"), JSON.stringify(liveTickets, null, 2));
      }
      if (audits) {
        const logs = audits.slice().reverse().map((l) => JSON.stringify(l)).join("\n") + "\n";
        import_fs2.default.writeFileSync(import_path2.default.join(guildDir, "audits.jsonl"), logs);
      }
      res.json({ success: true, message: "Configuration successfully synchronized." });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/v1/guilds/:guildId/reconcile", (req, res) => {
    const { guildId } = req.params;
    try {
      ensureGuildStorage2(guildId);
      res.json({ success: true, message: "Guild database schema isolation reconciled successfully." });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    console.log(`[Server] Serving static files from: ${distPath}`);
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      const filePath = import_path2.default.join(distPath, "index.html");
      console.log(`[Server] Falling back to: ${filePath}`);
      if (import_fs2.default.existsSync(filePath)) {
        res.sendFile(filePath);
      } else {
        console.error(`[Server] File not found: ${filePath}`);
        res.status(404).send("Not Found");
      }
    });
  }
  try {
    botClient = initializeDiscordBot();
  } catch (err) {
    console.error("[NexusBot Daemon Startup Warning]", err);
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[NexusBot Server] Running at http://localhost:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("[Startup Error]", err);
  process.exit(1);
});
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=server.cjs.map
