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

# 1. Initialize Git repository if not present, handling corruption gracefully
if [ ! -d ".git" ] || ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "[Git] Initializing or recovering git repository..."
    rm -rf .git
    git init || echo "[Git Warning] git init failed (no disk space left?)"
    git config user.name "Pterodactyl Host" 2>/dev/null || true
    git config user.email "bot@pterodactyl.local" 2>/dev/null || true
fi

# 2. Configure remote origin from variable if provided
if [ -n "$GITHUB_REPO_URL" ]; then
    echo "[Git] Setting repository origin to: $GITHUB_REPO_URL"
    if git remote | grep -q "origin" 2>/dev/null; then
        git remote set-url origin "$GITHUB_REPO_URL" 2>/dev/null || true
    else
        git remote add origin "$GITHUB_REPO_URL" 2>/dev/null || true
    fi
fi

# 3. Pull latest changes from GitHub automatically using shallow depth to conserve disk space
if git remote | grep -q "origin" 2>/dev/null; then
    echo "[Git] Fetching latest updates with shallow depth..."
    # Shallow fetch with depth 1 saves massive amounts of hosting storage
    git fetch origin --depth=1 --tags 2>/dev/null || git fetch origin --depth=1 2>/dev/null || true

    # Detect active remote branch (main or master)
    TARGET_BRANCH=""
    if git rev-parse --verify origin/main >/dev/null 2>&1; then
        TARGET_BRANCH="main"
    elif git rev-parse --verify origin/master >/dev/null 2>&1; then
        TARGET_BRANCH="master"
    fi

    if [ -n "$TARGET_BRANCH" ]; then
        echo "[Git] Syncing remote branch '$TARGET_BRANCH' (shallow checkout)..."
        git checkout -f -B "$TARGET_BRANCH" "origin/$TARGET_BRANCH" 2>/dev/null || true
        git reset --hard "origin/$TARGET_BRANCH" 2>/dev/null || true
        # Clean untracked files to keep things compact, keeping dist, rename, and local settings/env intact
        git clean -fd -e rename -e dist -e data -e .env 2>/dev/null || true
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

# 4. Install / Verify Node dependencies (skipping devDependencies to save space)
# Clean up any residual cache files first to free up as much space as possible
rm -rf .npm ~/.npm 2>/dev/null || true

if [ ! -d "node_modules" ]; then
    echo "[Node] node_modules not found. Installing production dependencies..."
    npm install --omit=dev --no-audit --no-fund || npm install --production --no-audit --no-fund
else
    echo "[Node] node_modules found. Ensuring native bindings are rebuilt..."
    npm rebuild || true
fi

# 5. Check for pre-built dist dashboard or rename folder
echo "[Build] Checking frontend web dashboard..."

if [ -d "rename" ]; then
    echo "[Build] 🔄 Renaming pre-built rename folder to dist..."
    rm -rf dist
    mv rename dist
    echo "[Build] ✅ Web dashboard dist directory successfully prepared from rename folder!"
elif [ -f "dist/index.html" ]; then
    echo "[Build] ✅ Pre-built dist/index.html found! Using committed production dashboard."
else
    echo "[Build] 📦 dist/index.html missing. Building web dashboard..."
    if npm run build && [ -f "dist/index.html" ]; then
        echo "[Build] ✅ Frontend build completed successfully!"
    else
        echo "[Build Warning] Frontend build failed or @rollup native binary incompatible. Attempting @rollup/wasm-node fallback..."
        npm install --no-audit --no-fund @rollup/wasm-node || true
        if npm run build && [ -f "dist/index.html" ]; then
            echo "[Build] ✅ Frontend build completed successfully with WASM fallback!"
        else
            echo "[Build Warning] Could not compile frontend, proceeding if server has fallback..."
        fi
    fi
fi

# 6. Start NexusBot
echo "[Server] Launching NexusBot..."
export NODE_ENV=production

if [ -f "server.js" ]; then
    echo "[Server] Launching root server.js entrypoint..."
    exec node server.js
elif [ -f "backend/server.js" ]; then
    echo "[Server] Launching backend/server.js entrypoint..."
    exec node backend/server.js
else
    echo "[Server] Launching default npm start..."
    exec npm start
fi
