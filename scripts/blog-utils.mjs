import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

export const SITE_URL = 'https://www.esytechcreative.com';
export const BLOG_CONTENT_DIR = 'content/blog';
export const BLOG_OUT_DIR = 'blog';
export const ARTICLE_OUT_DIR = 'blog';
export const GENERATED_COVER_DIR = 'assets/images/blog/generated';
export const INDEX_PATH = 'data/blog-index.json';
export const TOPICS_PATH = 'data/blog-topics.json';
export const CATEGORIES = [
  'Cybersecurity',
  'Scam Alerts',
  'Artificial Intelligence',
  'Wi-Fi & Networks',
  'Cloud & Infrastructure',
  'Web & Business',
  'Creative Technology'
];
export const CATEGORY_FILTERS = ['All', ...CATEGORIES];
export const STATUSES = ['draft', 'published', 'archived'];

marked.setOptions({ gfm: true, breaks: false, headerIds: true, mangle: false });

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

export function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function stripMarkdown(value = '') {
  return String(value)
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[#>*_\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function calculateReadingTime(markdown = '') {
  const words = stripMarkdown(markdown).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

export function listMarkdownFiles(dir = BLOG_CONTENT_DIR) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(file => file.endsWith('.md'))
    .sort()
    .map(file => path.join(dir, file));
}

export function loadArticles({ includeDrafts = true } = {}) {
  return listMarkdownFiles().map(filePath => {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = matter(raw);
    const article = normalizeArticle(parsed.data, parsed.content, filePath);
    return includeDrafts || article.status === 'published' ? article : null;
  }).filter(Boolean);
}

export function normalizeArticle(data, body, filePath) {
  const slug = data.slug || slugify(data.title || path.basename(filePath, '.md'));
  const readingMinutes = data.readingTime && data.readingTime !== 'auto'
    ? parseInt(String(data.readingTime), 10)
    : calculateReadingTime(body);
  return {
    ...data,
    slug,
    body: body.trim(),
    filePath,
    tags: Array.isArray(data.tags) ? data.tags : [],
    sources: Array.isArray(data.sources) ? data.sources : [],
    featured: Boolean(data.featured),
    readingMinutes,
    readingTime: `${readingMinutes} min read`,
    cover: data.cover && data.cover !== 'auto' ? data.cover : `/assets/images/blog/generated/${slug}.svg`,
    coverAlt: data.coverAlt || `Editorial cover for ${data.title}`,
    canonicalUrl: data.canonical && data.canonical !== 'auto' ? data.canonical : `${SITE_URL}/blog/${slug}/`
  };
}

export function markdownToSafeHtml(markdown = '') {
  const html = addHeadingIds(marked.parse(markdown));
  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'em', 'blockquote',
      'a', 'code', 'pre', 'hr', 'br', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      h2: ['id'],
      h3: ['id'],
      h4: ['id'],
      code: ['class']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }, true)
    }
  });
}

function addHeadingIds(html) {
  const seen = new Map();
  return html.replace(/<h([2-4])>(.*?)<\/h\1>/g, (match, level, text) => {
    const clean = text.replace(/<[^>]+>/g, '');
    const base = slugify(clean) || `heading-${level}`;
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    const id = count ? `${base}-${count + 1}` : base;
    return `<h${level} id="${id}">${text}</h${level}>`;
  });
}

export function validateArticle(article) {
  const errors = [];
  const required = ['title', 'slug', 'description', 'category', 'publishedAt', 'updatedAt', 'author', 'status', 'coverAlt'];
  for (const field of required) {
    if (!article[field]) errors.push(`${article.filePath}: missing ${field}`);
  }
  if (!STATUSES.includes(article.status)) errors.push(`${article.filePath}: invalid status "${article.status}"`);
  if (!CATEGORIES.includes(article.category)) errors.push(`${article.filePath}: invalid category "${article.category}"`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug || '')) errors.push(`${article.filePath}: invalid slug`);
  if (!isDate(article.publishedAt)) errors.push(`${article.filePath}: invalid publishedAt`);
  if (!isDate(article.updatedAt)) errors.push(`${article.filePath}: invalid updatedAt`);
  if (article.updatedAt && article.publishedAt && article.updatedAt < article.publishedAt) errors.push(`${article.filePath}: updatedAt before publishedAt`);
  if (!Array.isArray(article.tags) || article.tags.length === 0) errors.push(`${article.filePath}: tags must contain at least one item`);
  if (!article.body || stripMarkdown(article.body).length < 900) errors.push(`${article.filePath}: article body below useful minimum length`);
  if (/<script|<iframe|javascript:|onerror=|onload=/i.test(article.body)) errors.push(`${article.filePath}: unsafe Markdown content`);
  if (countPromotionalTerms(article.body) > 8) errors.push(`${article.filePath}: excessive promotional language`);
  return errors;
}

export function validateCollection(articles) {
  const errors = articles.flatMap(validateArticle);
  const seen = new Map();
  const titles = [];
  for (const article of articles) {
    if (seen.has(article.slug)) errors.push(`duplicate slug "${article.slug}" in ${article.filePath} and ${seen.get(article.slug)}`);
    seen.set(article.slug, article.filePath);
    const comparable = comparableText(article.title);
    if (titles.some(title => similarity(title, comparable) > 0.84)) errors.push(`${article.filePath}: highly similar title/topic detected`);
    titles.push(comparable);
  }
  return errors;
}

export function selectRelated(article, publishedArticles) {
  return publishedArticles
    .filter(item => item.slug !== article.slug)
    .map(item => {
      const sharedTags = item.tags.filter(tag => article.tags.includes(tag)).length;
      const score = (item.category === article.category ? 5 : 0) + sharedTags * 2 + (Date.parse(item.publishedAt) / 10000000000000);
      return { item, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(entry => entry.item);
}

export function buildToc(html) {
  const headings = [...html.matchAll(/<h2(?: id="([^"]+)")?>(.*?)<\/h2>/g)];
  if (headings.length < 3) return '';
  return `<nav class="article-toc" aria-label="Table of contents">
    <h2>Table of contents</h2>
    <ol>${headings.map(match => {
      const text = match[2].replace(/<[^>]+>/g, '');
      const id = match[1] || slugify(text);
      return `<li><a href="#${id}">${escapeHtml(text)}</a></li>`;
    }).join('')}</ol>
  </nav>`;
}

export function publicArticleIndex(article) {
  return {
    title: article.title,
    slug: article.slug,
    description: article.description,
    category: article.category,
    tags: article.tags,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    author: article.author,
    featured: article.featured,
    cover: article.cover,
    coverAlt: article.coverAlt,
    readingTime: article.readingTime,
    url: `/blog/${article.slug}/`,
    canonicalUrl: article.canonicalUrl
  };
}

export function formatDisplayDate(date) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
}

export function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function isDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function countPromotionalTerms(text) {
  return (text.match(/\b(best|guaranteed|perfect|ultimate|unbeatable|revolutionary|must-have)\b/gi) || []).length;
}

function comparableText(value = '') {
  return slugify(value).replace(/-/g, ' ');
}

function similarity(a, b) {
  const aSet = new Set(a.split(/\s+/).filter(Boolean));
  const bSet = new Set(b.split(/\s+/).filter(Boolean));
  const intersection = [...aSet].filter(word => bSet.has(word)).length;
  return intersection / Math.max(aSet.size, bSet.size, 1);
}
