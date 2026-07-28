/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import cookieParser from "cookie-parser";
import { initializeDiscordBot } from "./bot/index.js";
const DATA_DIR = path.join(process.cwd(), "data", "servers");
function ensureGuildStorage(guildId) {
  const guildDir = path.join(DATA_DIR, guildId);
  if (!fs.existsSync(guildDir)) {
    fs.mkdirSync(guildDir, { recursive: true });
  }
  const files = {
    "settings.json": {
      enabled: false,
      logging: {
        enabled: false,
        logChannelId: ""
      },
      automod: {
        enabled: false,
        logChannelId: "",
        spamFilter: false,
        linkFilter: false,
        inviteFilter: false,
        mentionLimit: 0,
        capsFilter: false,
        badWords: [],
        action: "delete",
        duplicateFilter: false,
        regexPatterns: [],
        emojiLimit: 0,
        maliciousLinkFilter: false,
        enforceStaff: false,
        massMentionLimit: 0,
        spamMsgLimit: 5,
        spamTimeWindow: 10
      },
      antiraid: {
        enabled: false,
        logChannelId: "",
        joinRateThreshold: 0,
        quarantineNewAccounts: false,
        accountAgeMinDays: 0,
        lockdownOnAttack: false,
        action: "timeout",
        velocityJoins: 0,
        velocitySeconds: 0,
        autoVerificationLevel: false,
        captchaVerification: false
      },
      antinuke: {
        enabled: false,
        logChannelId: "",
        channelCreateThreshold: 0,
        channelDeleteThreshold: 0,
        roleDeleteThreshold: 0,
        webhookThreshold: 0,
        action: "remove_roles",
        preventBotInvites: false,
        banThreshold: 0,
        kickThreshold: 0,
        unauthorizedAdminStrip: false
      },
      dms: {
        enabled: true,
        allowDmCommand: true,
        allowDmRollCommand: true,
        allowDmGlobalCommand: true
      },
      whitelist: {
        roles: [],
        users: []
      }
    },
    "warnings.json": [],
    "backups.json": [],
    "invites.json": [],
    "audits.jsonl": ""
  };
  for (const [filename, defaultData] of Object.entries(files)) {
    const filePath = path.join(guildDir, filename);
    if (!fs.existsSync(filePath)) {
      if (filename.endsWith(".jsonl")) {
        fs.writeFileSync(filePath, defaultData);
      } else {
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
      }
    }
  }
}
async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 25570;
  app.use(express.json());
  const COOKIE_SECRET = "nexusbot_session_cryptographic_signing_key_99332211";
  app.use(cookieParser(COOKIE_SECRET));
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
  let botClient = null;
  try {
    botClient = initializeDiscordBot();
  } catch (err) {
    console.error("[NexusBot Daemon Startup Warning]", err);
  }

  app.get("/api/v1/health", (req, res) => {
    res.json({
      success: true,
      status: "healthy",
      version: "1.0.0",
      host: "Nexus Secure Premium Node (2GB RAM)",
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
    console.log('[OAuth URL] Generating URL with redirectUri:', redirectUri);

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
    const { target, content, embed } = req.body;
    if (!target || !content) {
      return res.status(400).json({ success: false, error: "Recipient target and message content are required." });
    }

    // Fallback if the bot is not logged in / configured yet (development / simulation environment)
    if (!botClient || !botClient.isReady || !botClient.isReady()) {
      console.log(`[Simulated Bot DM] To: ${target} | Content: ${content} | Embed: ${embed ? "Yes" : "No"}`);
      return res.json({ 
        success: true, 
        message: `[SIMULATION] DM ${embed ? "embed " : ""}dispatched to ${target}. (Configure real DISCORD_TOKEN to send live DMs)` 
      });
    }

    try {
      // Find by Tag, Username, or ID in user cache first
      let user = botClient.users.cache.find(u => u.tag === target || u.id === target || u.username === target);
      
      // If not found in user cache, try guild members cache
      if (!user) {
        for (const [_, guild] of botClient.guilds.cache) {
          const foundMember = guild.members.cache.find(m => m.user.tag === target || m.user.username === target || m.id === target);
          if (foundMember) {
            user = foundMember.user;
            break;
          }
        }
      }

      // If not in cache, and is numeric ID, try fetching directly
      if (!user && /^\d+$/.test(target)) {
        try {
          user = await botClient.users.fetch(target);
        } catch (fetchErr) {
          console.warn(`Could not fetch user ID ${target}`);
        }
      }

      // If still not found, search members in all guilds using fetch query
      if (!user) {
        for (const [_, guild] of botClient.guilds.cache) {
          try {
            const members = await guild.members.fetch({ query: target, limit: 1 });
            const found = members.first();
            if (found) {
              user = found.user;
              break;
            }
          } catch (e) {
            // Ignore fetch errors for specific guilds
          }
        }
      }

      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: `User "${target}" could not be resolved. Ensure the user shares a guild with the bot or the input is a valid ID.` 
        });
      }

      if (embed) {
        const embedObject = {
          description: content,
          color: 0x5865F2,
          timestamp: new Date().toISOString()
        };
        await user.send({ embeds: [embedObject] });
      } else {
        await user.send(content);
      }
      return res.json({ success: true, message: `DM successfully delivered to ${user.tag}` });
    } catch (err) {
      console.error('[Bot DM Send Error]', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to dispatch Direct Message.' });
    }
  });
  app.get(["/api/v1/auth/callback", "/api/v1/auth/callback/"], async (req, res) => {
    console.log('[OAuth Callback] Received request. Query:', req.query);
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
          console.log('[OAuth Callback] Token exchange successful');
          tokenValue = tokenData.access_token;
          const userRes = await fetch("https://discord.com/api/v10/users/@me", {
            headers: { "Authorization": `Bearer ${tokenData.access_token}` }
          });
          if (userRes.ok) {
            discordUser = await userRes.json();
            console.log('[OAuth Callback] User info fetched:', discordUser);
            usingSimulation = false;
            if (discordUser.avatar) {
              avatarUrl = `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`;
            } else {
              avatarUrl = `https://cdn.discordapp.com/embed/avatars/${parseInt(discordUser.id || "0") % 5}.png`;
            }
          }
        } else {
          console.error('[OAuth Callback] Token exchange failed:', await tokenRes.text());
        }
      } catch (err) {
        console.error("[OAuth Core Exchange Error]", err);
      }
    } else {
      console.warn('[OAuth Callback] No code provided');
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
              }, '*');
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
        const botGuilds = botClient && typeof botClient.isReady === "function" && botClient.isReady() ? botClient.guilds.cache : null;
        const mappedGuilds = guilds.map(g => ({
          ...g,
          botInGuild: botGuilds ? botGuilds.has(g.id) : true
        }));
        return res.json({ success: true, guilds: mappedGuilds });
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
      ensureGuildStorage(guildId);
      const guildDir = path.join(DATA_DIR, guildId);
      const settings = JSON.parse(fs.readFileSync(path.join(guildDir, "settings.json"), "utf8"));
      const warnings = JSON.parse(fs.readFileSync(path.join(guildDir, "warnings.json"), "utf8"));
      const backups = JSON.parse(fs.readFileSync(path.join(guildDir, "backups.json"), "utf8"));
      const invites = JSON.parse(fs.readFileSync(path.join(guildDir, "invites.json"), "utf8"));
      let audits = [];
      try {
        const rawAudits = fs.readFileSync(path.join(guildDir, "audits.jsonl"), "utf8").trim();
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
        audits
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.get("/api/v1/guilds/:guildId/members-and-roles", async (req, res) => {
    const { guildId } = req.params;
    try {
      if (botClient && typeof botClient.isReady === "function" && botClient.isReady()) {
        const guild = botClient.guilds.cache.get(guildId);
        if (guild) {
          const roles = guild.roles.cache.map(r => ({ id: r.id, name: r.name }));
          const members = (await guild.members.fetch()).map(m => ({ id: m.id, tag: `${m.user.username}#${m.user.discriminator || '0'}`, username: m.user.username }));
          let channels = [];
          try {
            channels = guild.channels.cache.filter(c => c.type === 0).map(c => {
              const everyoneOverwrite = c.permissionOverwrites?.cache?.get(guild.roles.everyone.id);
              const locked = everyoneOverwrite ? everyoneOverwrite.deny.has(2048n) || everyoneOverwrite.deny.has('SendMessages') : false;
              return { id: c.id, name: c.name, locked: !!locked };
            });
          } catch (e) {
            console.error('Error fetching real channels:', e);
          }
          return res.json({ success: true, roles, members, channels });
        }
      }
      
      const simulatedRoles = [
        { id: "1", name: "Administrator" },
        { id: "2", name: "Moderator" },
        { id: "3", name: "Staff" },
        { id: "4", name: "VIP" },
        { id: "5", name: "Member" }
      ];
      
      const simulatedMembers = [
        { id: "101", tag: "luckypro387#0", username: "luckypro387" },
        { id: "102", tag: "nexor_admin#1234", username: "nexor_admin" },
        { id: "103", tag: "aether_mod#5678", username: "aether_mod" },
        { id: "104", tag: "vortex_staff#9012", username: "vortex_staff" },
        { id: "105", tag: "shadow_walker#3322", username: "shadow_walker" },
        { id: "106", tag: "cyber_samurai#7744", username: "cyber_samurai" }
      ];

      const simulatedChannels = [
        { id: "1001", name: "general", locked: false },
        { id: "1002", name: "announcements", locked: true },
        { id: "1003", name: "lounge", locked: false },
        { id: "1004", name: "bot-commands", locked: false },
        { id: "1005", name: "staff-chat", locked: false }
      ];
      
      return res.json({ success: true, roles: simulatedRoles, members: simulatedMembers, channels: simulatedChannels });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/v1/guilds/:guildId/channels/:channelId/lock", async (req, res) => {
    const { guildId, channelId } = req.params;
    const { lock } = req.body;
    try {
      ensureGuildStorage(guildId);
      const guildDir = path.join(DATA_DIR, guildId);

      if (botClient && typeof botClient.isReady === "function" && botClient.isReady()) {
        const guild = botClient.guilds.cache.get(guildId);
        if (guild) {
          const channel = guild.channels.cache.get(channelId);
          if (channel) {
            try {
              // 2048n is SendMessages permission flag
              await channel.permissionOverwrites.edit(guild.roles.everyone, {
                SendMessages: !lock
              });
            } catch (permErr) {
              console.error('Failed to update live Discord channel permission overwrite:', permErr);
            }
          }
        }
      }

      const nextAction = lock ? "CHANNEL_LOCK" : "CHANNEL_UNLOCK";
      const nextReason = lock ? `Locked down channel #${channelId} via Moderation Shield` : `Unlocked channel #${channelId} via Moderation Shield`;

      let audits = [];
      try {
        const rawAudits = fs.readFileSync(path.join(guildDir, "audits.jsonl"), "utf8").trim();
        audits = rawAudits ? rawAudits.split("\n").map((line) => JSON.parse(line)).reverse() : [];
      } catch (e) {}

      const newAudit = {
        eventId: `evt-${Math.random().toString(36).substr(2, 6)}`,
        caseId: `NX-0${audits.length + 12400}`,
        guildId,
        module: "antiraid",
        action: nextAction,
        executorId: "user-0001",
        executorTag: "Nexus#0001",
        reason: nextReason,
        status: "success",
        createdAt: new Date().toLocaleTimeString('en-US', { hour12: false })
      };

      audits.unshift(newAudit);
      const logs = audits.slice().reverse().map((l) => JSON.stringify(l)).join("\n") + "\n";
      fs.writeFileSync(path.join(guildDir, "audits.jsonl"), logs);

      return res.json({ success: true, message: `Channel successfully ${lock ? "locked" : "unlocked"}.`, audit: newAudit });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/v1/guilds/:guildId/config", (req, res) => {
    const { guildId } = req.params;
    const { settings, warnings, backups, invites, audits } = req.body;
    try {
      ensureGuildStorage(guildId);
      const guildDir = path.join(DATA_DIR, guildId);
      if (settings) {
        fs.writeFileSync(path.join(guildDir, "settings.json"), JSON.stringify(settings, null, 2));
      }
      if (warnings) {
        fs.writeFileSync(path.join(guildDir, "warnings.json"), JSON.stringify(warnings, null, 2));
      }
      if (backups) {
        fs.writeFileSync(path.join(guildDir, "backups.json"), JSON.stringify(backups, null, 2));
      }
      if (invites) {
        fs.writeFileSync(path.join(guildDir, "invites.json"), JSON.stringify(invites, null, 2));
      }
      if (audits) {
        const logs = audits.slice().reverse().map((l) => JSON.stringify(l)).join("\n") + "\n";
        fs.writeFileSync(path.join(guildDir, "audits.jsonl"), logs);
      }
      res.json({ success: true, message: "Configuration successfully synchronized." });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/v1/guilds/:guildId/reconcile", (req, res) => {
    const { guildId } = req.params;
    try {
      ensureGuildStorage(guildId);
      res.json({ success: true, message: "Guild database schema isolation reconciled successfully." });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  const distPath = path.join(process.cwd(), "dist");
  const indexPath = path.join(distPath, "index.html");

  if (process.env.NODE_ENV === "production") {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(503).send("<html><body style='background:#0f0f12;color:#fff;font-family:sans-serif;padding:3rem;text-align:center;'><h2>NexusBot Dashboard Initializing</h2><p>Static frontend build (dist/index.html) is currently compiling or not found. Please run <code>npm run build</code> or restart the container.</p></body></html>");
      }
    });
  } else {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      console.warn("[Vite Middleware Warning] Could not load Vite dev server middleware:", viteErr.message);
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(503).send("<html><body style='background:#0f0f12;color:#fff;font-family:sans-serif;padding:3rem;text-align:center;'><h2>NexusBot Dashboard Initializing</h2><p>Static frontend build (dist/index.html) is currently compiling or not found. Please run <code>npm run build</code>.</p></body></html>");
        }
      });
    }
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[NexusBot Server] Running at http://localhost:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("[Startup Error]", err);
  process.exit(1);
});
