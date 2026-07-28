import { spawn } from 'child_process';
import { existsSync } from 'fs';

console.log('==========================================');
console.log('    NexusBot Pterodactyl Bootloader       ');
console.log('==========================================');
console.log('[Runner] Initializing startup via index.js...');

if (!existsSync('pterodactyl-startup.sh')) {
  console.error('[Runner] Error: pterodactyl-startup.sh not found at root!');
  process.exit(1);
}

// Spawn bash to run pterodactyl-startup.sh
const env = {
  ...process.env,
  HOME: process.cwd(),
  npm_config_cache: `${process.cwd()}/.npm-cache`
};

const child = spawn('bash', ['pterodactyl-startup.sh'], {
  stdio: 'inherit',
  shell: true,
  env
});

child.on('close', (code) => {
  console.log(`[Runner] Pterodactyl startup script exited with code ${code}`);
  process.exit(code || 0);
});

child.on('error', (err) => {
  console.error('[Runner] Failed to start pterodactyl-startup.sh:', err);
  process.exit(1);
});

// Handle termination signals to forward them to the child process
const handleSignal = (signal) => {
  console.log(`[Runner] Received ${signal}, forwarding to startup process...`);
  if (child && !child.killed) {
    child.kill(signal);
  }
};

process.on('SIGINT', () => handleSignal('SIGINT'));
process.on('SIGTERM', () => handleSignal('SIGTERM'));
