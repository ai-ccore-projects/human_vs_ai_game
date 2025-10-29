'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { useImageManager } from '@/hooks/useImageManager';
import { useGameWithLeaderboard } from '@/stores/gameStore';

export const ImageManagerTest: React.FC = () => {
  // Not strictly needed for this tester, but keeping in case you log score/round later
  const gameStore = useGameWithLeaderboard();

  const {
    isLoading,
    loadError,
    status,
    initializeImages,
    loadNextPair,      // ✅ this exists
    resetImages,
    refreshCaches,
    isReady,
  } = useImageManager();

  // Local current image for preview (don’t depend on gameStore here)
  const [currentImage, setCurrentImage] = useState<{
    url: string;
    isAI: boolean;
    source?: string;
    difficulty?: string | number;
    round?: number;
  } | null>(null);

  // Wrap loadNextPair -> pick one image to display
  const loadNextImage = useCallback(async () => {
    const pair = await loadNextPair();
    if (!pair) throw new Error('No pair returned from loadNextPair()');

    // Try common shapes. Adjust if your pair schema differs.
    const candidate =
      // explicit fields (recommended)
      (pair as any).human ??
      (pair as any).ai ??
      // or an array fallback { images: [...] }
      ((pair as any).images?.[0] ?? null);

    if (!candidate?.url) throw new Error('Pair did not include a usable image');

    setCurrentImage(candidate);
    return candidate;
  }, [loadNextPair]);

  // Basic error boolean
  const hasError = !!loadError;

  // Cache/queue health derived only from fields we *know* exist
  const cacheHealth = useMemo(() => {
    const remaining = status?.remainingImages ?? 0;
    const preloadedPairs = status?.preloadPairQueue ?? 0;
    return {
      remaining,
      preloadedPairs,
      hasWork: remaining > 0 || preloadedPairs > 0,
    };
  }, [status]);

  // Optional debug info
  const [debugInfo, setDebugInfo] = useState<Record<string, any> | null>(null);
  const updateDebugInfo = () => {
    setDebugInfo({
      timestamp: new Date().toISOString(),
      status,
      isReady,
      isLoading,
      loadError,
      currentImage,
      leafPath: status?.leafPath ?? null,
    });
  };

  const [testResults, setTestResults] = useState<string[]>([]);
  const addTestResult = (message: string) => {
    setTestResults(prev => [
      ...prev.slice(-9),
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  const runImageTest = async () => {
    addTestResult('🧪 Starting image fetch test...');
    try {
      for (let i = 1; i <= 5; i++) {
        const img = await loadNextImage();
        addTestResult(`✅ Loaded image for round ${i}: ${img?.source || 'Unknown'}`);
        await new Promise(r => setTimeout(r, 500));
      }
      addTestResult('🎉 Image test completed successfully!');
    } catch (error: any) {
      addTestResult(`❌ Image test failed: ${String(error?.message ?? error)}`);
    }
  };

  const testInitialization = async () => {
    addTestResult('🔄 Testing initialization...');
    try {
      await initializeImages();
      addTestResult('✅ Initialization completed');
    } catch (error: any) {
      addTestResult(`❌ Initialization failed: ${String(error?.message ?? error)}`);
    }
  };

  const testCacheRefresh = async () => {
    addTestResult('🔄 Testing cache refresh...');
    try {
      await refreshCaches();
      addTestResult('✅ Cache refresh completed');
    } catch (error: any) {
      addTestResult(`❌ Cache refresh failed: ${String(error?.message ?? error)}`);
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
              <span className={status?.initialized ? 'text-green-400' : 'text-red-400'}>
                {status?.initialized ? 'Yes' : 'No'}
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
          <h2 className="text-xl font-semibold mb-4 text-neon-blue">Cache / Queue</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Remaining Images:</span>
              <span className={cacheHealth.remaining > 0 ? 'text-green-400' : 'text-yellow-400'}>
                {cacheHealth.remaining}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Preload Pair Queue:</span>
              <span className={cacheHealth.preloadedPairs > 0 ? 'text-green-400' : 'text-yellow-400'}>
                {cacheHealth.preloadedPairs}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Work Available:</span>
              <span className={cacheHealth.hasWork ? 'text-green-400' : 'text-yellow-400'}>
                {cacheHealth.hasWork ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-neon-blue">Current Image</h2>
          {currentImage ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Type:</span>
                <span className={currentImage.isAI ? 'text-red-400' : 'text-blue-400'}>
                  {currentImage.isAI ? 'AI' : 'Human'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Source:</span>
                <span className="text-neon-green text-xs">{currentImage.source ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span>Difficulty:</span>
                <span className="text-neon-yellow">{String(currentImage.difficulty ?? '—')}</span>
              </div>
              <div className="flex justify-between">
                <span>Round:</span>
                <span className="text-neon-purple">{String(currentImage.round ?? '—')}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-400">No image loaded</p>
          )}
        </div>
      </div>

      {/* Current Image Display */}
      {currentImage && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-neon-blue">Current Image Preview</h2>
          <div className="bg-gray-800 p-4 rounded-lg">
            <img
              src={currentImage.url}
              alt="Current game image"
              className="max-w-md mx-auto rounded-lg shadow-lg"
              onError={() => addTestResult(`❌ Failed to load image: ${currentImage?.url}`)}
              onLoad={() => addTestResult(`✅ Image loaded successfully: ${currentImage?.source ?? 'Unknown'}`)}
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
          <p>• Click "Initialize System" to load image caches</p>
          <p>• Use "Load Next Image" to fetch a single image (via loadNextPair)</p>
          <p>• Run "Image Test" to automatically fetch 5 images in sequence</p>
          <p>• Watch the console for detailed logging</p>
          <p>• Use "Refresh Caches" if remote sources fail</p>
        </div>
      </div>
    </div>
  );
};

export default ImageManagerTest;
