import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { BLOG_CONTENT_DIR, ensureDir, loadArticles, slugify, validateCollection } from './blog-utils.mjs';
import { generateCovers } from './generate-cover.mjs';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run') || process.env.CONTENT_RADAR_DRY_RUN === 'true';
const selectedCategory = process.env.CONTENT_RADAR_CATEGORY || 'Cybersecurity';
const sourcesPath = 'data/blog-sources.json';
const sources = fs.existsSync(sourcesPath) ? JSON.parse(fs.readFileSync(sourcesPath, 'utf8')) : { sources: [] };
const articles = loadArticles({ includeDrafts: true });

const candidate = chooseCandidate(selectedCategory, articles, sources.sources || []);
if (!candidate) {
  console.log('No suitable topic found. Nothing to propose.');
  process.exit(0);
}

if (dryRun) {
  console.log(JSON.stringify({ dryRun: true, candidate }, null, 2));
  process.exit(0);
}

ensureDir(BLOG_CONTENT_DIR);
const filePath = path.join(BLOG_CONTENT_DIR, `${candidate.slug}.md`);
if (fs.existsSync(filePath)) throw new Error(`Refusing to overwrite existing article: ${filePath}`);
fs.writeFileSync(filePath, renderDraft(candidate), 'utf8');
generateCovers();

const validation = validateCollection(loadArticles({ includeDrafts: true }));
if (validation.length) {
  validation.forEach(error => console.error(error));
  process.exit(1);
}

const branch = `blog-draft/${candidate.slug}`;
try {
  execFileSync('git', ['checkout', '-b', branch], { stdio: 'inherit' });
  execFileSync('git', ['add', filePath, `assets/images/blog/generated/${candidate.slug}.svg`], { stdio: 'inherit' });
  execFileSync('git', ['commit', '-m', `Blog draft: ${candidate.title}`], { stdio: 'inherit' });
  execFileSync('git', ['push', '-u', 'origin', branch], { stdio: 'inherit' });
  const body = prBody(candidate, filePath);
  execFileSync('gh', ['pr', 'create', '--title', `Blog draft: ${candidate.title}`, '--body', body], { stdio: 'inherit' });
} catch (error) {
  console.log('Draft created locally. PR creation requires git remote push permissions and GitHub CLI.');
  console.log(`Branch intended: ${branch}`);
  console.log(`Article path: ${filePath}`);
}

function chooseCandidate(category, existing, configuredSources) {
  const officialSources = configuredSources.filter(source => source.enabled && source.reliability === 'official');
  const title = category === 'Scam Alerts'
    ? 'How to verify urgent digital requests before you respond'
    : 'A practical security checklist for small business websites';
  const slug = slugify(title);
  if (existing.some(article => article.slug === slug || article.title.toLowerCase() === title.toLowerCase())) return null;
  return {
    title,
    slug,
    category: category === 'All' ? 'Cybersecurity' : category,
    reason: 'Useful evergreen security topic aligned with ESY TECH services and suitable for human review.',
    sources: officialSources.slice(0, 3)
  };
}

function renderDraft(candidate) {
  const today = new Date().toISOString().slice(0, 10);
  return `---
title: "${candidate.title}"
slug: "${candidate.slug}"
description: "A draft security guide prepared by the Content Radar for human review."
category: "${candidate.category}"
tags:
  - "Security"
  - "Small Business"
publishedAt: "${today}"
updatedAt: "${today}"
author: "ESY TECH CREATIVE"
status: "draft"
featured: false
cover: "/assets/images/blog/generated/${candidate.slug}.svg"
coverAlt: "Editorial cover for ${candidate.title}"
readingTime: "auto"
canonical: "auto"
sources:
${candidate.sources.map(source => `  - title: "${source.name}"\n    url: "${source.baseUrl}"\n    publisher: "${source.name}"\n    accessedAt: "${today}"`).join('\n') || '  []'}
---

## Editorial review required

This draft was created by the Content Radar and must be reviewed before publication.

## Practical checklist

- Verify the technical facts against the listed sources.
- Add project-specific examples where useful.
- Keep recommendations realistic and avoid absolute guarantees.
- Change status to published only after human approval.
`;
}

function prBody(candidate, filePath) {
  return `Selected topic: ${candidate.title}

Category: ${candidate.category}

Reason for selection: ${candidate.reason}

Article path: ${filePath}
Generated cover path: assets/images/blog/generated/${candidate.slug}.svg

Validation result: passed locally before PR creation.

Human approval checklist:
- [ ] Review article and sources
- [ ] Review generated cover
- [ ] Confirm no duplicate content
- [ ] Change status from draft to published only when approved
- [ ] Run npm run build
`;
}
