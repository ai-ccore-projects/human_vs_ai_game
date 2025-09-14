'use client';

import React, { useState } from 'react';
import { useImageManager, useImageManagerDebug } from '@/hooks/useImageManager';
import { useGameWithLeaderboard } from '@/stores/gameStore';

/**
 * Development component to test the ImageManager functionality
 * This will be removed in production
 */
export const ImageManagerTest: React.FC = () => {
  const gameStore = useGameWithLeaderboard();
  const {
    isLoading,
    loadError,
    imageManagerStatus,
    initializeImages,
    loadNextImage,
    resetImages,
    refreshCaches,
    isReady,
    hasError,
    cacheHealth,
  } = useImageManager();

  const {
    debugInfo,
    updateDebugInfo,
  } = useImageManagerDebug();

  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runImageTest = async () => {
    addTestResult('🧪 Starting image fetch test...');
    
    try {
      // Test multiple image fetches
      for (let i = 1; i <= 5; i++) {
        await loadNextImage();
        addTestResult(`✅ Loaded image for round ${i}: ${gameStore.currentImage?.source || 'Unknown'}`);
        
        // Small delay between fetches
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      addTestResult('🎉 Image test completed successfully!');
    } catch (error) {
      addTestResult(`❌ Image test failed: ${error}`);
    }
  };

  const testInitialization = async () => {
    addTestResult('🔄 Testing initialization...');
    try {
      await initializeImages();
      addTestResult('✅ Initialization completed');
    } catch (error) {
      addTestResult(`❌ Initialization failed: ${error}`);
    }
  };

  const testCacheRefresh = async () => {
    addTestResult('🔄 Testing cache refresh...');
    try {
      await refreshCaches();
      addTestResult('✅ Cache refresh completed');
    } catch (error) {
      addTestResult(`❌ Cache refresh failed: ${error}`);
    }
  };

  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-neon-green">Image Manager Test</h1>
      
      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-neon-blue">System Status</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Loading:</span>
              <span className={isLoading ? 'text-yellow-400' : 'text-green-400'}>
                {isLoading ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Ready:</span>
              <span className={isReady ? 'text-green-400' : 'text-red-400'}>
                {isReady ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Error:</span>
              <span className={hasError ? 'text-red-400' : 'text-green-400'}>
                {hasError ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Initialized:</span>
              <span className={imageManagerStatus.initialized ? 'text-green-400' : 'text-red-400'}>
                {imageManagerStatus.initialized ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
          {loadError && (
            <div className="mt-4 p-2 bg-red-900 rounded text-red-200 text-sm">
              Error: {loadError}
            </div>
          )}
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-neon-blue">Cache Status</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>AI Images:</span>
              <span className={cacheHealth.aiImages ? 'text-green-400' : 'text-yellow-400'}>
                {imageManagerStatus.aiCache}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Human Images:</span>
              <span className={cacheHealth.humanImages ? 'text-green-400' : 'text-yellow-400'}>
                {imageManagerStatus.humanCache}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Preloaded:</span>
              <span className={cacheHealth.preloaded ? 'text-green-400' : 'text-yellow-400'}>
                {imageManagerStatus.preloadQueue}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Used Images:</span>
              <span className="text-neon-cyan">{imageManagerStatus.usedImages}</span>
            </div>
            <div className="flex justify-between">
              <span>Lexica Working:</span>
              <span className={imageManagerStatus.lexicaWorking ? 'text-green-400' : 'text-red-400'}>
                {imageManagerStatus.lexicaWorking ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Fallback Mode:</span>
              <span className={imageManagerStatus.fallbackMode ? 'text-yellow-400' : 'text-green-400'}>
                {imageManagerStatus.fallbackMode ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-neon-blue">Current Image</h2>
          {gameStore.currentImage ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Type:</span>
                <span className={gameStore.currentImage.isAI ? 'text-red-400' : 'text-blue-400'}>
                  {gameStore.currentImage.isAI ? 'AI' : 'Human'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Source:</span>
                <span className="text-neon-green text-xs">{gameStore.currentImage.source}</span>
              </div>
              <div className="flex justify-between">
                <span>Difficulty:</span>
                <span className="text-neon-yellow">{gameStore.currentImage.difficulty}</span>
              </div>
              <div className="flex justify-between">
                <span>Round:</span>
                <span className="text-neon-purple">{gameStore.currentImage.round}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-400">No image loaded</p>
          )}
        </div>
      </div>

      {/* Current Image Display */}
      {gameStore.currentImage && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-neon-blue">Current Image Preview</h2>
          <div className="bg-gray-800 p-4 rounded-lg">
            <img
              src={gameStore.currentImage.url}
              alt="Current game image"
              className="max-w-md mx-auto rounded-lg shadow-lg"
              onError={(e) => {
                addTestResult(`❌ Failed to load image: ${gameStore.currentImage?.url}`);
              }}
              onLoad={() => {
                addTestResult(`✅ Image loaded successfully: ${gameStore.currentImage?.source}`);
              }}
            />
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="space-y-4 mb-8">
        <div className="flex flex-wrap gap-4">
          <h2 className="w-full text-xl font-semibold text-neon-blue">Image Manager Controls</h2>
          <button 
            onClick={testInitialization}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Initialize System'}
          </button>
          <button 
            onClick={loadNextImage}
            disabled={isLoading || !isReady}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Load Next Image
          </button>
          <button 
            onClick={runImageTest}
            disabled={isLoading || !isReady}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            Run Image Test (5x)
          </button>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={resetImages}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Reset Images
          </button>
          <button 
            onClick={testCacheRefresh}
            disabled={isLoading}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
          >
            Refresh Caches
          </button>
          <button 
            onClick={updateDebugInfo}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Update Debug Info
          </button>
        </div>
      </div>

      {/* Test Results */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-neon-blue">Test Results</h2>
        <div className="bg-gray-800 p-4 rounded-lg">
          {testResults.length > 0 ? (
            <div className="space-y-1 text-sm font-mono">
              {testResults.map((result, index) => (
                <div key={index} className="text-gray-300">
                  {result}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No test results yet</p>
          )}
        </div>
      </div>

      {/* Debug Information */}
      {debugInfo && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-neon-blue">Debug Information</h2>
          <div className="bg-gray-800 p-4 rounded-lg">
            <pre className="text-xs text-gray-300 overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-4 text-neon-blue">Test Instructions</h2>
        <div className="space-y-2 text-sm">
          <p>• Click "Initialize System" to load AI and human image caches</p>
          <p>• Use "Load Next Image" to fetch individual images</p>
          <p>• Run "Image Test" to automatically fetch 5 images in sequence</p>
          <p>• Watch the console for detailed logging information</p>
          <p>• Check cache status to monitor system health</p>
          <p>• Use "Refresh Caches" if Lexica API fails</p>
        </div>
      </div>
    </div>
  );
};

export default ImageManagerTest;
