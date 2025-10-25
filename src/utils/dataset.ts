// src/utils/datasets.ts
// How many files actually exist in each leaf folder.
// Update these when you add more images.

export const DATASET_COUNTS: Record<string, { ai: number; human: number }> = {
  // classic paintings (you said there are 10 each)
  'classic_paintings/watercolor_paintings': { ai: 10, human: 10 },
  'classic_paintings/oil_on_canvas': { ai: 10, human: 10 },
};
