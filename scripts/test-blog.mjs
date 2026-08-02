import assert from 'node:assert/strict';
import fs from 'node:fs';
import { coverSvg, wrapTitle } from './generate-cover.mjs';
import {
  calculateReadingTime,
  loadArticles,
  markdownToSafeHtml,
  selectRelated,
  validateCollection
} from './blog-utils.mjs';

const articles = loadArticles({ includeDrafts: true });
const published = articles.filter(article => article.status === 'published');

assert.equal(published.length, 4, 'four starter articles should be published');
assert.equal(validateCollection(articles).length, 0, 'front matter should be valid');
assert.equal(new Set(articles.map(article => article.slug)).size, articles.length, 'slugs should be unique');
assert.ok(!published.some(article => article.status !== 'published'), 'drafts should be excluded from published list');
assert.ok(calculateReadingTime(published[0].body) >= 1, 'reading time should be generated');
assert.ok(coverSvg(published[0]).includes('<svg'), 'cover generation should return SVG');
assert.ok(wrapTitle('A very long article title that should wrap safely inside the generated cover').length > 1, 'cover title wrapping should split long titles');
assert.ok(fs.existsSync(`blog/${published[0].slug}/index.html`), 'generated article route should exist');
assert.ok(fs.readFileSync('sitemap.xml', 'utf8').includes(`/blog/${published[0].slug}/`), 'sitemap should contain article');
assert.ok(fs.readFileSync('blog/rss.xml', 'utf8').includes(published[0].title), 'RSS should contain article');
assert.ok(selectRelated(published[0], published).length <= 3, 'related articles should be capped at three');
assert.ok(!markdownToSafeHtml('[bad](javascript:alert(1)) <script>alert(1)</script>').includes('javascript:'), 'unsafe markdown should be sanitized');

const index = JSON.parse(fs.readFileSync('data/blog-index.json', 'utf8'));
const searchHit = index.articles.filter(article => [article.title, article.description, article.category, ...(article.tags || [])].join(' ').toLowerCase().includes('wi-fi'));
assert.ok(searchHit.length >= 1, 'category/search data should be usable client-side');

console.log('Blog tests passed.');
