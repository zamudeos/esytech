import fs from 'node:fs';
import path from 'node:path';
import { GENERATED_COVER_DIR, ensureDir, escapeHtml, loadArticles } from './blog-utils.mjs';

const themes = {
  'Wi-Fi & Networks': { a: '#ff2a7f', b: '#4f8cff', icon: 'wifi' },
  'Scam Alerts': { a: '#ff2a7f', b: '#b32bf9', icon: 'alert' },
  Cybersecurity: { a: '#4f8cff', b: '#ff2a7f', icon: 'shield' },
  'Artificial Intelligence': { a: '#b32bf9', b: '#4f8cff', icon: 'nodes' },
  'Cloud & Infrastructure': { a: '#4f8cff', b: '#8b5cf6', icon: 'cloud' },
  'Web & Business': { a: '#ff2a7f', b: '#22d3ee', icon: 'web' },
  'Creative Technology': { a: '#ff2a7f', b: '#f59e0b', icon: 'spark' }
};

export function wrapTitle(title, max = 28) {
  const words = String(title).split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = `${current} ${word}`.trim();
    if (next.length > max && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4);
}

export function coverSvg(article) {
  const theme = themes[article.category] || themes.Cybersecurity;
  const lines = wrapTitle(article.title);
  const fontSize = lines.length > 3 ? 54 : 64;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" role="img" aria-labelledby="cover-title cover-desc">
  <title id="cover-title">${escapeHtml(article.title)}</title>
  <desc id="cover-desc">${escapeHtml(article.coverAlt)}</desc>
  <defs>
    <radialGradient id="glow" cx="20%" cy="15%" r="72%">
      <stop offset="0%" stop-color="${theme.a}" stop-opacity="0.42"/>
      <stop offset="52%" stop-color="${theme.b}" stop-opacity="0.13"/>
      <stop offset="100%" stop-color="#050508" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="lineGrad" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="${theme.a}"/>
      <stop offset="100%" stop-color="${theme.b}"/>
    </linearGradient>
    <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="14" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="1200" height="675" fill="#050508"/>
  <rect width="1200" height="675" fill="url(#glow)"/>
  <path d="M690 120 C820 70 950 92 1110 36" stroke="url(#lineGrad)" stroke-width="2" opacity="0.38" fill="none"/>
  <path d="M650 570 C820 480 930 520 1160 410" stroke="url(#lineGrad)" stroke-width="2" opacity="0.32" fill="none"/>
  <g opacity="0.18" stroke="rgba(255,255,255,0.6)" stroke-width="1">
    <path d="M76 554 H1118"/><path d="M76 487 H1118"/><path d="M76 420 H1118"/>
    <path d="M156 88 V610"/><path d="M266 88 V610"/><path d="M376 88 V610"/>
  </g>
  <g transform="translate(760 150)" filter="url(#softGlow)">${iconSvg(theme.icon)}</g>
  <text x="86" y="92" fill="${theme.a}" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="5">${escapeHtml(article.category.toUpperCase())}</text>
  <g font-family="Outfit, Inter, Arial, sans-serif" font-weight="700" fill="#ffffff">
    ${lines.map((line, index) => `<text x="86" y="${238 + index * 72}" font-size="${fontSize}">${escapeHtml(line)}</text>`).join('\n    ')}
  </g>
  <text x="86" y="588" fill="rgba(255,255,255,0.74)" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="600">ESY TECH CREATIVE</text>
  <rect x="84" y="616" width="180" height="3" rx="1.5" fill="url(#lineGrad)"/>
</svg>`;
}

function iconSvg(type) {
  const stroke = 'stroke="url(#lineGrad)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none"';
  if (type === 'wifi') return `<path ${stroke} d="M40 150 C110 85 230 85 300 150"/><path ${stroke} d="M90 205 C135 165 205 165 250 205"/><circle cx="170" cy="265" r="20" fill="url(#lineGrad)"/><path ${stroke} d="M170 30 L300 80 V180 C300 250 250 300 170 326 C90 300 40 250 40 180 V80 Z"/>`;
  if (type === 'alert') return `<path ${stroke} d="M170 42 L318 302 H22 Z"/><path ${stroke} d="M170 128 V210"/><circle cx="170" cy="260" r="8" fill="url(#lineGrad)"/>`;
  if (type === 'nodes') return `<circle cx="80" cy="80" r="28" fill="url(#lineGrad)"/><circle cx="260" cy="120" r="30" fill="url(#lineGrad)"/><circle cx="150" cy="260" r="34" fill="url(#lineGrad)"/><circle cx="312" cy="285" r="22" fill="url(#lineGrad)"/><path ${stroke} d="M106 90 L230 112 M94 104 L140 230 M177 250 L288 282 M248 146 L166 232"/>`;
  if (type === 'cloud') return `<path ${stroke} d="M96 260 H280 C326 260 354 232 354 194 C354 156 326 128 286 124 C268 74 224 48 172 58 C126 66 94 102 86 148 C48 156 24 184 24 224 C24 246 48 260 96 260 Z"/>`;
  if (type === 'web') return `<rect x="36" y="74" width="312" height="214" rx="28" ${stroke}/><path ${stroke} d="M36 132 H348 M96 88 V118 M148 88 V118 M206 180 H292 M96 220 H292"/>`;
  if (type === 'spark') return `<path ${stroke} d="M172 28 L204 138 L314 170 L204 202 L172 312 L140 202 L30 170 L140 138 Z"/>`;
  return `<path ${stroke} d="M170 30 L300 84 V180 C300 254 248 304 170 328 C92 304 40 254 40 180 V84 Z"/><path ${stroke} d="M116 178 L154 218 L230 138"/>`;
}

export function generateCovers() {
  ensureDir(GENERATED_COVER_DIR);
  const articles = loadArticles({ includeDrafts: true });
  return articles.map(article => {
    const outPath = path.join(GENERATED_COVER_DIR, `${article.slug}.svg`);
    fs.writeFileSync(outPath, coverSvg(article), 'utf8');
    return outPath.replaceAll('\\', '/');
  });
}

if (process.argv[1] && process.argv[1].replaceAll('\\', '/').endsWith('/scripts/generate-cover.mjs')) {
  const files = generateCovers();
  console.log(`Generated ${files.length} cover(s).`);
  files.forEach(file => console.log(file));
}
