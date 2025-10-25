'use client';

import React from 'react';
import { useGameLogic } from '@/hooks/useGameLogic';

/**
 * Development component to test the game store functionality
 * This will be removed in production
 */
export const GameStoreTest: React.FC = () => {
  const {
    // Game state
    screen,
    lives,
    score,
    round,
    combo,
    timer,
    isPlaying,
    playerName,
    
    // Actions
    setScreen,
    startNewGame,
    makeGuess,
    setPlayerName,
    addScore,
    loseLife,
    addLife,
    
    // Stats
    getStats,
    getLeaderboard,
    
    // Settings
    soundEnabled,
    toggleSound,
    debugMode,
    setDebugMode,
  } = useGameLogic();
  
  const stats = getStats();
  const leaderboard = getLeaderboard();
  
  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-neon-green">Game Store Test</h1>
      
      {/* Current Game State */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-neon-blue">Game State</h2>
          <div className="space-y-2">
            <p>Screen: <span className="text-neon-green">{screen}</span></p>
            <p>Lives: <span className="text-neon-pink">{lives}</span></p>
            <p>Score: <span className="text-neon-yellow">{score}</span></p>
            <p>Round: <span className="text-neon-purple">{round}</span></p>
            <p>Combo: <span className="text-neon-orange">{combo}</span></p>
            <p>Timer: <span className="text-neon-cyan">{timer}</span></p>
            <p>Playing: <span className={isPlaying ? 'text-green-400' : 'text-red-400'}>{isPlaying ? 'Yes' : 'No'}</span></p>
            <p>Player: <span className="text-neon-green">{playerName || 'None'}</span></p>
          </div>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-neon-blue">Statistics</h2>
          <div className="space-y-2">
            <p>Games Played: <span className="text-neon-green">{stats.gamesPlayed}</span></p>
            <p>Total Correct: <span className="text-green-400">{stats.totalCorrect}</span></p>
            <p>Total Wrong: <span className="text-red-400">{stats.totalWrong}</span></p>
            <p>Accuracy: <span className="text-neon-yellow">{stats.accuracy.toFixed(1)}%</span></p>
            <p>Best Score: <span className="text-neon-pink">{stats.bestScore}</span></p>
            <p>Best Round: <span className="text-neon-purple">{stats.bestRound}</span></p>
            <p>Max Combo: <span className="text-neon-orange">{stats.maxCombo}</span></p>
          </div>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-neon-blue">Settings</h2>
          <div className="space-y-2">
            <p>Sound: <span className={soundEnabled ? 'text-green-400' : 'text-red-400'}>{soundEnabled ? 'On' : 'Off'}</span></p>
            <p>Debug: <span className={debugMode ? 'text-green-400' : 'text-red-400'}>{debugMode ? 'On' : 'Off'}</span></p>
          </div>
        </div>
      </div>
      
      {/* Control Buttons */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <h2 className="w-full text-xl font-semibold text-neon-blue">Screen Navigation</h2>
          <button 
            onClick={() => setScreen('attract')}
            className="px-4 py-2 bg-neon-purple text-black rounded hover:bg-opacity-80"
          >
            Attract Mode
          </button>
          <button 
            onClick={() => setScreen('nameEntry')}
            className="px-4 py-2 bg-neon-green text-black rounded hover:bg-opacity-80"
          >
            Name Entry
          </button>
          <button 
            onClick={() => setScreen('game')}
            className="px-4 py-2 bg-neon-blue text-black rounded hover:bg-opacity-80"
          >
            Game Screen
          </button>
          <button 
            onClick={() => setScreen('gameOver')}
            className="px-4 py-2 bg-neon-pink text-black rounded hover:bg-opacity-80"
          >
            LOST
          </button>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <h2 className="w-full text-xl font-semibold text-neon-blue">Game Actions</h2>
          <button 
            onClick={startNewGame}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Start New Game
          </button>
          <button 
            onClick={() => makeGuess(true)}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Guess AI
          </button>
          <button 
            onClick={() => makeGuess(false)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Guess Human
          </button>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <h2 className="w-full text-xl font-semibold text-neon-blue">Player Actions</h2>
          <input
            type="text"
            placeholder="Enter name (3 letters)"
            maxLength={3}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
          />
          <button 
            onClick={() => addScore(100)}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Add 100 Points
          </button>
          <button 
            onClick={loseLife}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Lose Life
          </button>
          <button 
            onClick={addLife}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Add Life
          </button>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <h2 className="w-full text-xl font-semibold text-neon-blue">Settings</h2>
          <button 
            onClick={toggleSound}
            className={`px-4 py-2 rounded ${soundEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white`}
          >
            Toggle Sound
          </button>
          <button 
            onClick={() => setDebugMode(!debugMode)}
            className={`px-4 py-2 rounded ${debugMode ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'} text-white`}
          >
            Toggle Debug
          </button>
        </div>
      </div>
      
      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4 text-neon-blue">Leaderboard</h2>
          <div className="bg-gray-800 p-4 rounded-lg">
            {leaderboard.map((entry, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-b-0">
                <span className="text-neon-green">{index + 1}. {entry.name}</span>
                <span className="text-neon-yellow">{entry.score}</span>
                <span className="text-neon-purple">Round {entry.round}</span>
                <span className="text-neon-orange">Combo {entry.maxCombo}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Instructions */}
      <div className="mt-8 bg-gray-800 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-4 text-neon-blue">Test Instructions</h2>
        <div className="space-y-2 text-sm">
          <p>• Use the buttons above to test different game states and actions</p>
          <p>• Enter a 3-letter name and start a new game to test the full flow</p>
          <p>• Use "Guess AI" and "Guess Human" to simulate player choices</p>
          <p>• Watch the statistics update as you play</p>
          <p>• Test the leaderboard by achieving different scores</p>
          <p>• Keyboard controls: Arrow keys or A/D for guesses, Escape to pause</p>
        </div>
      </div>
    </div>
  );
};

export default GameStoreTest;
