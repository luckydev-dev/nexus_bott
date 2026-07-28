<!-- nexus bot -->
# 🎮 Zero-Console Pterodactyl GitHub Auto-Sync Setup

Since your hosting panel does not allow console access, you can set everything up simply by editing files in your **File Manager** and updating your **Startup Command**!

---

## 🚀 Setup Instructions (Zero Console Access Required)

### 1️⃣ Edit `pterodactyl-startup.sh` in File Manager
Open `pterodactyl-startup.sh` in your Pterodactyl File Manager and paste your GitHub repository URL on line 10:

```bash
GITHUB_REPO_URL="https://github.com/YOUR_USERNAME/YOUR_REPO.git"
```

### 2️⃣ Change Your Startup Command in Pterodactyl
1. Go to your Pterodactyl Panel -> **Startup** tab.
2. In the **Startup Command** box (or main script configuration), set it to:
   ```bash
   bash pterodactyl-startup.sh
   ```
3. Click **Save** (or restart the server).

---

## 🔄 How Workflow Works Now:

1. Whenever you edit your code, push your commits to GitHub (`git push`).
2. Click **Restart** in your hosting Pterodactyl panel.
3. The server automatically:
   - 🔄 Pulls the latest code directly from your GitHub repository.
   - 📦 Installs any new npm dependencies.
   - 🛠️ Builds the dashboard UI.
   - ⚡ Starts NexusBot automatically!

No manual zips, uploads, or terminal commands needed ever again!
