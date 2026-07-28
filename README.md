<!-- nexus bot -->
# NexusBot Deployment & Hosting Guide

This project is fully divided into two standalone, production-ready modules designed for separate hosting environments:
1. **Frontend**: Hosted on **Vercel**
2. **Backend & Discord Bot**: Hosted on **Pterodactyl** (Node.js container)

---

## 📁 1. Frontend (Deploy to Vercel)

The `/frontend` folder is a self-contained React + Vite + Tailwind CSS application.

### Vercel Deployment Steps:
1. Import this repository into Vercel or upload the `frontend` folder.
2. Set the **Root Directory** in Vercel to `frontend`.
3. Configure the following **Environment Variables** in Vercel:
   - `VITE_API_URL`: Set this to your Pterodactyl backend's public URL (e.g. `https://your-pterodactyl-subdomain.com` or `http://your-node-ip:3000`).
4. Vercel will automatically build using `npm run build` and serve the static assets.

---

## 🖥️ 2. Backend & Discord Bot (Deploy to Pterodactyl)

The `/backend` folder handles the REST APIs and is the gateway for your **Discord.js Bot client**. It includes native Express CORS compatibility to safely receive configuration updates from your Vercel frontend.

### Pterodactyl Deployment Steps:
1. Create a **Node.js** server on your Pterodactyl panel.
2. Upload all contents of the `/backend` directory to the server files root.
3. Configure your server's **Startup Parameters**:
   - Set the main entrypoint file to: `server.ts` or run `npm run dev` to launch the tsx compiler.
4. Set the following **Environment Variables** in the Pterodactyl "Startup" settings or upload a `.env` file containing:
   - `PORT`: Set to `3000` (or whatever port your allocation uses).
   - `DISCORD_BOT_TOKEN`: Your secret Discord Application Bot Token.
5. Click **Start** to run the bot and dashboard synchronizer!

---

## 🔒 Security & CORS
The backend server contains custom built-in CORS configurations to allow secure cross-domain resource sharing between your Vercel URL and the Pterodactyl process.
