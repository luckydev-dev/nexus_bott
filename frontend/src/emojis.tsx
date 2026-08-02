/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';

// Custom Discord Emoji raw strings as requested
export const nexus_ticket = '<:nexus_ticket:1533385159678754970>';
export const nexus_createticket = '<:nexus_createticket:1533385194411655310>';

export interface CustomEmojiMeta {
  name: string;
  id: string;
  raw: string;
  url: string;
}

export const DISCORD_EMOJIS: Record<string, CustomEmojiMeta> = {
  nexus_ticket: {
    name: 'nexus_ticket',
    id: '1533385159678754970',
    raw: '<:nexus_ticket:1533385159678754970>',
    url: 'https://cdn.discordapp.com/emojis/1533385159678754970.png'
  },
  nexus_createticket: {
    name: 'nexus_createticket',
    id: '1533385194411655310',
    raw: '<:nexus_createticket:1533385194411655310>',
    url: 'https://cdn.discordapp.com/emojis/1533385194411655310.png'
  }
};

interface DiscordEmojiProps {
  name?: 'nexus_ticket' | 'nexus_createticket' | string;
  className?: string;
  sizeClassName?: string;
  alt?: string;
}

/**
 * Component to render custom Discord emoji CDN images.
 */
export function DiscordEmoji({
  name = 'nexus_ticket',
  className = '',
  sizeClassName = 'w-4 h-4 inline-block align-middle',
  alt
}: DiscordEmojiProps) {
  const [hasError, setHasError] = useState(false);

  // Normalize key or raw discord string like <:nexus_ticket:1533385159678754970>
  let meta: CustomEmojiMeta = DISCORD_EMOJIS.nexus_ticket;

  if (name.includes('1533385194411655310') || name.includes('createticket')) {
    meta = DISCORD_EMOJIS.nexus_createticket;
  } else if (name.includes('1533385159678754970') || name.includes('ticket')) {
    meta = DISCORD_EMOJIS.nexus_ticket;
  }

  if (hasError) {
    return (
      <span className={`inline-flex items-center justify-center font-mono font-bold text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/30 ${className}`}>
        :{meta.name}:
      </span>
    );
  }

  return (
    <img
      src={meta.url}
      alt={alt || meta.name}
      className={`${sizeClassName} ${className} object-contain transition-transform duration-200 hover:scale-110 shrink-0`}
      onError={() => setHasError(true)}
      referrerPolicy="no-referrer"
    />
  );
}

interface DiscordUserAvatarProps {
  avatarUrl?: string | null;
  username?: string;
  className?: string;
  sizeClassName?: string;
}

/**
 * Component to render User Avatar without using standard unicode emojis like 👤.
 */
export function DiscordUserAvatar({
  avatarUrl,
  username = 'User',
  className = '',
  sizeClassName = 'w-7 h-7'
}: DiscordUserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        className={`${sizeClassName} ${className} rounded-full object-cover border border-indigo-500/30 shrink-0`}
        onError={() => setImgError(true)}
        referrerPolicy="no-referrer"
      />
    );
  }

  // Custom User Badge using custom ticket emoji icon / initials badge instead of generic unicode 👤
  return (
    <div className={`${sizeClassName} ${className} rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 border border-indigo-400/30 text-white font-extrabold flex items-center justify-center text-[10px] shrink-0 font-mono shadow-sm`}>
      <DiscordEmoji name="nexus_ticket" sizeClassName="w-3.5 h-3.5" />
    </div>
  );
}
