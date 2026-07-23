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
GITHUB_REPO_URL="https://github.com/luckydev-dev/nexus_bott.git"

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
    git fetch origin --tags || git fetch --all || true

    # Detect active remote branch (main or master)
    TARGET_BRANCH=""
    if git rev-parse --verify origin/main >/dev/null 2>&1; then
        TARGET_BRANCH="main"
    elif git rev-parse --verify origin/master >/dev/null 2>&1; then
        TARGET_BRANCH="master"
    fi

    if [ -n "$TARGET_BRANCH" ]; then
        echo "[Git] Checking out remote branch '$TARGET_BRANCH'..."
        git checkout -f -B "$TARGET_BRANCH" "origin/$TARGET_BRANCH" || true
        git reset --hard "origin/$TARGET_BRANCH" || true
        git pull origin "$TARGET_BRANCH" --rebase || git pull origin "$TARGET_BRANCH" || true
        echo "[Git] ✅ Repository successfully updated from GitHub ($TARGET_BRANCH)!"
    else
        echo "[Git] ⚠️ Notice: Neither origin/main nor origin/master was found on remote."
    fi
else
    echo "[Git] ⚠️ Notice: GITHUB_REPO_URL is empty in pterodactyl-startup.sh."
    echo "[Git] Set GITHUB_REPO_URL=\"https://github.com/...\" at top of pterodactyl-startup.sh to auto-sync!"
fi

# Verification check for package.json
if [ ! -f "package.json" ]; then
    echo "[ERROR] package.json not found in working directory!"
    if [ -f "backend/package.json" ]; then
        echo "[Recovery] Found backend/package.json, copying to root..."
        cp backend/package.json ./package.json
    fi
fi

# 4. Install Node dependencies
echo "[Node] Installing npm dependencies..."
npm install --no-audit --no-fund

# 5. Build frontend web dashboard
echo "[Build] Building web dashboard..."
npm run build || echo "[Build Warning] Frontend build skipped or encountered issue, continuing startup..."

# 6. Start NexusBot
echo "[Server] Launching NexusBot..."
export NODE_ENV=production
exec npm start
