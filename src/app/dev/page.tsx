// AI vs Human - Development Test Page
// Testing components for game store and image manager

import GameStoreTest from '@/components/dev/GameStoreTest';
import ImageManagerTest from '@/components/dev/ImageManagerTest';

export default function DevPage() {
  return (
    <div className="game-container">
      {/* CRT Effect Overlay */}
      <div className="crt-effect"></div>
      
      {/* Digital Rain Background */}
      <div className="digital-rain"></div>
      
      {/* Main Content */}
      <div className="screen center">
        <div className="flex flex-col items-center justify-center min-h-screen w-full max-w-4xl mx-auto px-8">
          
          {/* Header Section */}
          <div className="text-center mb-12">
            {/* Game Title with Glitch Effect */}
            <h1 className="font-arcade text-6xl md:text-8xl text-glow text-glitch mb-6">
              DEV MODE
            </h1>
            
            {/* Subtitle */}
            <p className="font-mono text-xl text-glow-magenta">
              Development Testing Interface
            </p>
          </div>
          
          {/* Navigation */}
          <div className="flex gap-4 mb-8">
            <a href="/" className="btn-neon">
              ← Back to Game
            </a>
          </div>
        </div>
      </div>
      
      {/* Game Store Test Component */}
      <GameStoreTest />
      
      {/* Image Manager Test Component */}
      <ImageManagerTest />
    </div>
  );
}
