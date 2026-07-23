#!/bin/bash
# ==============================================================================
# 🚀 Pterodactyl Automatic GitHub Sync & Startup Script
# ==============================================================================
# NO CONSOLE ACCESS NEEDED!
# Simply set your GITHUB_REPO_URL below, upload these files to your hosting panel,
# and set your Pterodactyl Startup Command to:
#    bash pterodactyl-startup.sh
# ==============================================================================

# ⬇️ SET YOUR GITHUB REPOSITORY URL HERE ⬇️
# Example: GITHUB_REPO_URL="https://github.com/your-username/your-repo.git"
GITHUB_REPO_URL=""

echo "=========================================="
echo "   NexusBot Zero-Console GitHub Sync     "
echo "=========================================="

# 1. Initialize Git repository if not present
if [ ! -d ".git" ]; then
    echo "[Git] Initializing git repository..."
    git init
    git config user.name "Pterodactyl Host"
    git config user.email "bot@pterodactyl.local"
fi

# 2. Configure remote origin from variable if provided
if [ -n "$GITHUB_REPO_URL" ]; then
    echo "[Git] Setting repository origin to: $GITHUB_REPO_URL"
    if git remote | grep -q "origin"; then
        git remote set-url origin "$GITHUB_REPO_URL"
    else
        git remote add origin "$GITHUB_REPO_URL"
    fi
fi

# 3. Pull latest changes from GitHub automatically
if git remote | grep -q "origin"; then
    echo "[Git] Pulling latest code updates from GitHub..."
    git fetch --all --tags
    BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
    if [ "$BRANCH" = "HEAD" ] || [ -z "$BRANCH" ]; then
        BRANCH="main"
    fi
    git checkout -B $BRANCH 2>/dev/null || true
    git reset --hard origin/$BRANCH 2>/dev/null || git reset --hard origin/master 2>/dev/null || true
    git pull origin $BRANCH --rebase || true
    echo "[Git] ✅ Repository successfully updated from GitHub!"
else
    echo "[Git] ⚠️ Notice: GITHUB_REPO_URL is empty in pterodactyl-startup.sh."
    echo "[Git] Set GITHUB_REPO_URL=\"https://github.com/...\" at top of pterodactyl-startup.sh to auto-sync!"
fi

# 4. Install Node dependencies
echo "[Node] Installing npm dependencies..."
npm install --no-audit --no-fund

# 5. Build frontend web dashboard
echo "[Build] Building web dashboard..."
npm run build

# 6. Start NexusBot
echo "[Server] Launching NexusBot..."
exec npm start
