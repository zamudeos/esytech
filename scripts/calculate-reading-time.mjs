import fs from 'node:fs';
import { calculateReadingTime } from './blog-utils.mjs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/calculate-reading-time.mjs content/blog/article.md');
  process.exit(1);
}

const markdown = fs.readFileSync(file, 'utf8');
console.log(`${calculateReadingTime(markdown)} min read`);
