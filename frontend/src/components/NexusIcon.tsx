import React, { useState } from 'react';
import { DISCORD_EMOJIS } from '../emojis';

interface NexusIconProps {
  name: string;
  fallback: React.ReactNode;
  className?: string;
  sizeClassName?: string;
}

export function NexusIcon({ name, fallback, className = '', sizeClassName = 'w-4 h-4' }: NexusIconProps) {
  const [hasError, setHasError] = useState(false);
  
  let src = `/assets/emojis/nexus_${name}.png`;
  
  if (name === 'ticket' || name === 'nexus_ticket' || name.includes('1533385159678754970')) {
    src = DISCORD_EMOJIS.nexus_ticket.url;
  } else if (name === 'createticket' || name === 'nexus_createticket' || name.includes('1533385194411655310')) {
    src = DISCORD_EMOJIS.nexus_createticket.url;
  }

  if (hasError) {
    return <div className={`flex items-center justify-center shrink-0 ${className}`}>{fallback}</div>;
  }

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <img
        src={src}
        alt={`nexus_${name}`}
        className={`${sizeClassName} object-contain transition-all duration-300 hover:scale-110`}
        onError={() => setHasError(true)}
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

