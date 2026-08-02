import fs from 'node:fs';
import { loadArticles, validateCollection } from './blog-utils.mjs';

export function validateBlog({ requireCovers = true, silent = false } = {}) {
  const articles = loadArticles({ includeDrafts: true });
  const errors = validateCollection(articles);

  if (requireCovers) {
    for (const article of articles.filter(item => item.status === 'published')) {
      const coverPath = article.cover.replace(/^\//, '');
      if (!fs.existsSync(coverPath)) errors.push(`${article.filePath}: missing cover ${coverPath}`);
    }
  }

  if (errors.length) {
    if (!silent) {
      console.error('Blog validation failed:');
      errors.forEach(error => console.error(`- ${error}`));
    }
    return { ok: false, errors, articles };
  }

  if (!silent) console.log(`Blog validation passed: ${articles.length} article(s), ${articles.filter(a => a.status === 'published').length} published.`);
  return { ok: true, errors: [], articles };
}

if (process.argv[1] && process.argv[1].replaceAll('\\', '/').endsWith('/scripts/validate-blog.mjs')) {
  const result = validateBlog();
  if (!result.ok) process.exit(1);
}
