// src/app/display/page.tsx
// TV Display page — shows game visuals, no interactive elements, no audio.

import { DisplayRouter } from '@/components/display/DisplayRouter';

export const metadata = {
  title: 'AI vs Human — TV Display',
  description: 'Display screen for the AI vs Human arcade game',
};

export default function DisplayPage() {
  return <DisplayRouter />;
}
