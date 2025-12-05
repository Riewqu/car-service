'use client';

import { useState, useEffect, ReactNode } from 'react';
import PinLock from './PinLock';

type PinProtectionProps = {
  children: ReactNode;
};

export default function PinProtection({ children }: PinProtectionProps) {
  const [isUnlocked, setIsUnlocked] = useState(true); // Start as unlocked to avoid hydration mismatch
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This runs only on client-side after hydration
    setIsClient(true);

    const hasPin = localStorage.getItem('app_pin');
    if (!hasPin) {
      setIsUnlocked(true);
      return;
    }

    const sessionUnlocked = sessionStorage.getItem('pin_unlocked');
    if (sessionUnlocked === 'true') {
      setIsUnlocked(true);
    } else {
      setIsUnlocked(false);
    }
  }, []);

  const handleUnlock = () => {
    setIsUnlocked(true);
  };

  // Don't render PIN lock during SSR or before client hydration
  if (!isClient) {
    return null;
  }

  if (!isUnlocked) {
    return <PinLock onUnlock={handleUnlock} />;
  }

  return <>{children}</>;
}
