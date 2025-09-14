'use client';

import React, { useEffect, useState } from 'react';
import { GameImageManager } from '@/utils/imageManager';

export default function TestPage() {
  const [status, setStatus] = useState('Initializing...');
  const [imageCount, setImageCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testImageManager = async () => {
      try {
        setStatus('Creating ImageManager...');
        const manager = new GameImageManager();
        
        setStatus('Initializing caches...');
        await manager.initializeImageCaches();
        
        const managerStatus = manager.getStatus();
        setImageCount(managerStatus.aiCache + managerStatus.humanCache);
        setStatus('✅ Success! Images loaded');
        
        console.log('ImageManager Status:', managerStatus);
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        setError(errorMsg);
        setStatus('❌ Failed');
        console.error('ImageManager test failed:', error);
      }
    };

    testImageManager();
  }, []);

  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen">
      <h1 className="text-3xl font-bold mb-8">Image Manager Test</h1>
      
      <div className="space-y-4">
        <div>Status: <span className="font-mono">{status}</span></div>
        <div>Images Loaded: <span className="font-mono">{imageCount}</span></div>
        {error && (
          <div className="text-red-400">Error: <span className="font-mono">{error}</span></div>
        )}
      </div>
      
      <div className="mt-8">
        <a href="/" className="text-blue-400 hover:underline">← Back to Game</a>
      </div>
    </div>
  );
}
