import React from 'react';
import { motion } from 'framer-motion';
import { useSound } from '@/hooks/useSoundManager';

interface ArcadeButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  hotkey?: string;
  active?: boolean;
}

export const ArcadeButton: React.FC<ArcadeButtonProps> = ({
  onClick,
  disabled,
  className,
  children,
  hotkey,
  active = false,
}) => {
  const { soundManager } = useSound();

  const handleClick = () => {
    if (soundManager) {
      soundManager.playSound('click', 0.5);
    }
    onClick();
  };

  const handleHover = () => {
    if (soundManager) {
      soundManager.playSound('buttonHover', 0.3);
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      onHoverStart={handleHover}
      disabled={disabled}
      className={`relative group font-arcade text-2xl px-8 py-4 rounded-lg border-4 border-b-8 transition-all duration-100 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95, y: 4 }}
      animate={active ? { scale: [1, 1.06, 1], boxShadow: ['0 0 0px rgba(255,255,255,0)','0 0 24px rgba(255,255,255,0.5)','0 0 0px rgba(255,255,255,0)'] } : {}}
      transition={{ duration: 1, repeat: active ? Infinity : 0 }}
    >
      {active && (
        <div className="absolute -inset-2 rounded-xl ring-4 ring-yellow-300/70 animate-pulse" />
      )}
      <div className="relative z-10">{children}</div>
      {hotkey && (
        <div className="absolute -top-2 -right-2 bg-white text-black text-sm font-bold rounded-full h-8 w-8 flex items-center justify-center border-2 border-black">
          {hotkey}
        </div>
      )}
    </motion.button>
  );
};
