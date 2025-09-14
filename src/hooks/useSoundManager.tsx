'use client';

import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { SoundManager } from '@/utils/soundManager';

interface SoundContextType {
  soundManager: SoundManager | null;
  isSoundInitialized: boolean;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export const SoundProvider = ({ children }: { children: ReactNode }) => {
  const soundManagerRef = useRef<SoundManager | null>(null);
  const [isSoundInitialized, setIsSoundInitialized] = React.useState(false);

  if (!soundManagerRef.current) {
    soundManagerRef.current = new SoundManager();
  }

  useEffect(() => {
    const initialize = async () => {
      if (soundManagerRef.current && !isSoundInitialized) {
        await soundManagerRef.current.initializeSounds();
        setIsSoundInitialized(true);
      }
    };
    initialize();
  }, [isSoundInitialized]);

  // Resume audio context on user interaction
  useEffect(() => {
    const handleInteraction = async () => {
      if (soundManagerRef.current) {
        await soundManagerRef.current.resumeAudioContext();
      }
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  return (
    <SoundContext.Provider value={{ soundManager: soundManagerRef.current, isSoundInitialized }}>
      {children}
    </SoundContext.Provider>
  );
};

export const useSound = (): SoundContextType => {
  const context = useContext(SoundContext);
  if (context === undefined) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return context;
};
