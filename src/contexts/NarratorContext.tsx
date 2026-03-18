'use client';

import React, { createContext, useContext } from 'react';
import { useNarrator } from '@/hooks/useNarrator';

// Extract the return type from the hook
type NarratorApi = ReturnType<typeof useNarrator>;

const NarratorContext = createContext<NarratorApi | null>(null);

/**
 * Wrap the controller subtree in this provider. All children can then
 * call `useNarratorContext()` and get the SAME narrator instance.
 */
export const NarratorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const narrator = useNarrator();
  return <NarratorContext.Provider value={narrator}>{children}</NarratorContext.Provider>;
};

/**
 * Use this inside any controller screen or AccessibilityPanel
 * instead of calling useNarrator() directly.
 */
export function useNarratorContext(): NarratorApi {
  const ctx = useContext(NarratorContext);
  if (!ctx) throw new Error('useNarratorContext must be used inside <NarratorProvider>');
  return ctx;
}
