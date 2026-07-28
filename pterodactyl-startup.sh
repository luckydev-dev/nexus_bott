#!/bin/bash
# Pterodactyl Startup Script for NexusBot

echo "Starting NexusBot..."

# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Run the backend server and Discord bot
exec node backend/server.js
