// src/app/controller/page.tsx
// Kiosk Controller page — touch inputs, audio, game logic.
'use client';

import { SoundProvider } from '@/hooks/useSoundManager';
import { ControllerRouter } from '@/components/controller/ControllerRouter';

export default function ControllerPage() {
  return (
    <SoundProvider>
      <ControllerRouter />
    </SoundProvider>
  );
}
