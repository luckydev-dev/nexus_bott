// nexus bot
import React, { useState } from 'react';

interface NexusIconProps {
  name: string;
  fallback: React.ReactNode;
  className?: string;
  sizeClassName?: string;
}

export function NexusIcon({ name, fallback, className = '', sizeClassName = 'w-4 h-4' }: NexusIconProps) {
  const [hasError, setHasError] = useState(false);
  const src = `/assets/emojis/nexus_${name}.png`;

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
