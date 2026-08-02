import fs from 'node:fs';
import path from 'node:path';
import { BLOG_CONTENT_DIR, ensureDir, slugify } from './blog-utils.mjs';

const title = process.argv.slice(2).join(' ').trim();
if (!title) {
  console.error('Usage: node scripts/create-article-draft.mjs "Article title"');
  process.exit(1);
}

ensureDir(BLOG_CONTENT_DIR);
const slug = slugify(title);
const filePath = path.join(BLOG_CONTENT_DIR, `${slug}.md`);
if (fs.existsSync(filePath)) {
  console.error(`Draft already exists: ${filePath}`);
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const draft = `---
title: "${title.replaceAll('"', '\\"')}"
slug: "${slug}"
description: "Draft description to be reviewed before publication."
category: "Web & Business"
tags:
  - "Draft"
publishedAt: "${today}"
updatedAt: "${today}"
author: "ESY TECH CREATIVE"
status: "draft"
featured: false
cover: "/assets/images/blog/generated/${slug}.svg"
coverAlt: "Editorial cover for ${title.replaceAll('"', '\\"')}"
readingTime: "auto"
canonical: "auto"
sources: []
---

## Working title

Write the draft here. Keep factual claims sourced and avoid publishing before human review.
`;

fs.writeFileSync(filePath, draft, 'utf8');
console.log(`Created ${filePath}`);
