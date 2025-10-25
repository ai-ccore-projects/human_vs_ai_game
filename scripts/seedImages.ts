// scripts/seedImages.ts
import { db } from '../src/lib/db';

const picsumAI = [
  'https://picsum.photos/id/100/1024/1024?blur=2&grayscale',
  'https://picsum.photos/id/102/1024/1024?grayscale',
  'https://picsum.photos/id/104/1024/1024?blur=1',
  'https://picsum.photos/id/106/1024/1024?blur=3&grayscale',
  'https://picsum.photos/id/108/1024/1024',
  'https://picsum.photos/id/110/1024/1024?blur=2',
  'https://picsum.photos/id/112/1024/1024?grayscale',
  'https://picsum.photos/id/114/1024/1024',
  'https://picsum.photos/id/116/1024/1024?blur=1',
  'https://picsum.photos/id/118/1024/1024?blur=2&grayscale',
];

const picsumHuman = [
  'https://picsum.photos/id/237/1024/1024',
  'https://picsum.photos/id/238/1024/1024',
  'https://picsum.photos/id/239/1024/1024',
  'https://picsum.photos/id/240/1024/1024',
  'https://picsum.photos/id/241/1024/1024',
  'https://picsum.photos/id/242/1024/1024',
  'https://picsum.photos/id/243/1024/1024',
  'https://picsum.photos/id/244/1024/1024',
  'https://picsum.photos/id/245/1024/1024',
  'https://picsum.photos/id/246/1024/1024',
];

const insert = db.prepare(`
  INSERT OR IGNORE INTO images (url, is_ai, active) VALUES (?, ?, 1)
`);

db.transaction(() => {
  picsumAI.forEach((url) => insert.run(url, 1));
  picsumHuman.forEach((url) => insert.run(url, 0));
})();

const count = db.prepare('SELECT COUNT(*) as c FROM images').get() as { c: number };
console.log(`✅ Seed complete. Images in DB: ${count.c}`);
