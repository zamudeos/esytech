import fs from 'node:fs';
import path from 'node:path';
import {
  BLOG_OUT_DIR,
  CATEGORY_FILTERS,
  CATEGORIES,
  INDEX_PATH,
  SITE_URL,
  TOPICS_PATH,
  buildToc,
  ensureDir,
  escapeHtml,
  formatDisplayDate,
  loadArticles,
  markdownToSafeHtml,
  publicArticleIndex,
  selectRelated,
  validateCollection,
  writeJson
} from './blog-utils.mjs';
import { generateCovers } from './generate-cover.mjs';

export function generateBlog() {
  generateCovers();
  const allArticles = loadArticles({ includeDrafts: true });
  const errors = validateCollection(allArticles);
  if (errors.length) {
    console.error('Blog generation failed:');
    errors.forEach(error => console.error(`- ${error}`));
    process.exit(1);
  }

  const published = allArticles
    .filter(article => article.status === 'published')
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  writeJson(INDEX_PATH, {
    generatedAt: new Date().toISOString(),
    siteUrl: SITE_URL,
    categories: CATEGORY_FILTERS,
    articles: published.map(publicArticleIndex)
  });

  writeJson(TOPICS_PATH, {
    categories: CATEGORIES.map(category => ({
      name: category,
      count: published.filter(article => article.category === category).length
    }))
  });

  ensureDir(BLOG_OUT_DIR);
  fs.writeFileSync(path.join(BLOG_OUT_DIR, 'index.html'), renderBlogArchive(published), 'utf8');
  fs.writeFileSync(path.join(BLOG_OUT_DIR, 'rss.xml'), renderRss(published), 'utf8');

  for (const article of published) {
    const html = markdownToSafeHtml(article.body);
    const toc = buildToc(html);
    const related = selectRelated(article, published);
    const outDir = path.join(BLOG_OUT_DIR, article.slug);
    ensureDir(outDir);
    fs.writeFileSync(path.join(outDir, 'index.html'), renderArticlePage(article, html, toc, related), 'utf8');
  }

  updateSitemap(published);
  return { published, covers: published.map(article => article.cover) };
}

function renderBlogArchive(articles) {
  const featured = articles.find(article => article.featured) || articles[0];
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="description" content="Practical content about cybersecurity, artificial intelligence, online protection, digital infrastructure, and modern business technology.">
  <link rel="canonical" href="${SITE_URL}/blog/">
  <link rel="alternate" type="application/rss+xml" title="ESY TECH CREATIVE Blog RSS" href="${SITE_URL}/blog/rss.xml">
  <link rel="icon" type="image/png" href="/assets/favicons/favicon.png">
  <title>Blog | ESY TECH CREATIVE</title>
  <style>${blogCss()}</style>
</head>
<body>
  <main class="blog-page">
    <header class="blog-header">
      <a class="brand" href="/">ESY TECH CREATIVE</a>
      <a class="back-link" href="/?panel=blog">Open site experience</a>
    </header>
    <section class="blog-hero">
      <span class="micro">INSIGHTS & SECURITY RADAR</span>
      <h1>Ideas, guidance, and alerts for the digital world</h1>
      <p>Practical content about cybersecurity, artificial intelligence, online protection, digital infrastructure, and modern business technology.</p>
    </section>
    ${featured ? renderFeatured(featured) : ''}
    <section class="blog-controls" aria-label="Blog filters">
      <label for="blog-search">Search articles</label>
      <div class="search-row"><input id="blog-search" type="search" placeholder="Search by title, category, or tag"><button id="blog-clear" type="button">Clear</button></div>
      <div class="filter-row" role="list">${CATEGORY_FILTERS.map((category, index) => `<button class="blog-filter ${index === 0 ? 'active' : ''}" type="button" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join('')}</div>
    </section>
    <section class="article-grid" id="blog-grid">${articles.map(renderCard).join('')}</section>
    <p class="empty-state" id="blog-empty" hidden>No articles match your search.</p>
  </main>
  <script>${archiveScript()}</script>
</body>
</html>`;
}

function renderFeatured(article) {
  return `<section class="featured-article">
    <img src="${article.cover}" alt="${escapeHtml(article.coverAlt)}">
    <div><span class="micro">FEATURED ARTICLE</span><h2>${escapeHtml(article.title)}</h2><p>${escapeHtml(article.description)}</p><a class="primary-link" href="/blog/${article.slug}/">Read article</a></div>
  </section>`;
}

function renderCard(article) {
  const updated = article.updatedAt !== article.publishedAt;
  return `<article class="article-card" data-title="${escapeHtml(article.title.toLowerCase())}" data-description="${escapeHtml(article.description.toLowerCase())}" data-category="${escapeHtml(article.category)}" data-tags="${escapeHtml(article.tags.join(' ').toLowerCase())}">
    <a class="card-media" href="/blog/${article.slug}/"><img src="${article.cover}" alt="${escapeHtml(article.coverAlt)}" loading="lazy"></a>
    <div class="card-copy">
      <div class="card-meta"><span>${escapeHtml(article.category)}</span>${article.featured ? '<span>Featured</span>' : ''}${updated ? '<span>Updated</span>' : ''}</div>
      <h2><a href="/blog/${article.slug}/">${escapeHtml(article.title)}</a></h2>
      <p>${escapeHtml(article.description)}</p>
      <div class="card-footer"><span>${formatDisplayDate(article.publishedAt)} · ${article.readingTime}</span><a href="/blog/${article.slug}/">Read article</a></div>
    </div>
  </article>`;
}

function renderArticlePage(article, bodyHtml, toc, related) {
  const updated = article.updatedAt !== article.publishedAt;
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    image: `${SITE_URL}${article.cover}`,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: { '@type': 'Organization', name: article.author },
    publisher: { '@type': 'Organization', name: 'ESY TECH CREATIVE' },
    mainEntityOfPage: article.canonicalUrl,
    articleSection: article.category
  };
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog/` },
      { '@type': 'ListItem', position: 3, name: article.title, item: article.canonicalUrl }
    ]
  };
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="description" content="${escapeHtml(article.description)}">
  <link rel="canonical" href="${article.canonicalUrl}">
  <link rel="alternate" type="application/rss+xml" title="ESY TECH CREATIVE Blog RSS" href="${SITE_URL}/blog/rss.xml">
  <link rel="icon" type="image/png" href="/assets/favicons/favicon.png">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(article.title)}">
  <meta property="og:description" content="${escapeHtml(article.description)}">
  <meta property="og:url" content="${article.canonicalUrl}">
  <meta property="og:image" content="${SITE_URL}${article.cover}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(article.title)}">
  <meta name="twitter:description" content="${escapeHtml(article.description)}">
  <meta name="twitter:image" content="${SITE_URL}${article.cover}">
  <title>${escapeHtml(article.title)} | ESY TECH CREATIVE</title>
  <script type="application/ld+json">${JSON.stringify(structured)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>
  <style>${blogCss()}</style>
</head>
<body>
  <main class="article-page">
    <header class="blog-header"><a class="brand" href="/">ESY TECH CREATIVE</a><a class="back-link" href="/blog/">Back to blog</a></header>
    <article class="article-shell">
      <header class="article-hero">
        <span class="micro">${escapeHtml(article.category)}</span>
        <h1>${escapeHtml(article.title)}</h1>
        <p>${escapeHtml(article.description)}</p>
        <div class="article-meta"><span>${formatDisplayDate(article.publishedAt)}</span>${updated ? `<span>Updated ${formatDisplayDate(article.updatedAt)}</span>` : ''}<span>${article.readingTime}</span><span>${escapeHtml(article.author)}</span></div>
        <img src="${article.cover}" alt="${escapeHtml(article.coverAlt)}">
      </header>
      ${toc}
      <div class="article-content">${bodyHtml}</div>
      ${renderSources(article)}
      ${renderRelated(related)}
      <section class="article-cta">
        <h2>Need help protecting or modernizing your digital environment?</h2>
        <p>ESY TECH CREATIVE develops websites, intelligent applications, AI automation, cloud infrastructure, network solutions, and creative digital experiences.</p>
        <div><a class="primary-link" href="/?panel=contact">Start a project</a><a class="secondary-link" href="/?panel=services">Explore our services</a></div>
      </section>
    </article>
  </main>
</body>
</html>`;
}

function renderSources(article) {
  if (!article.sources.length) return '';
  return `<section class="article-sources"><h2>Sources</h2><ul>${article.sources.map(source => `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title)}</a>${source.publisher ? ` · ${escapeHtml(source.publisher)}` : ''}${source.accessedAt ? ` · accessed ${escapeHtml(source.accessedAt)}` : ''}</li>`).join('')}</ul></section>`;
}

function renderRelated(related) {
  if (!related.length) return '';
  return `<section class="related-articles"><h2>Related articles</h2><div>${related.map(article => `<a href="/blog/${article.slug}/"><span>${escapeHtml(article.category)}</span><strong>${escapeHtml(article.title)}</strong></a>`).join('')}</div></section>`;
}

function renderRss(articles) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>ESY TECH CREATIVE Blog</title>
    <link>${SITE_URL}/blog/</link>
    <description>Ideas, guidance, and alerts for the digital world.</description>
    <language>en</language>
    ${articles.map(article => `<item><title>${escapeHtml(article.title)}</title><link>${article.canonicalUrl}</link><guid>${article.canonicalUrl}</guid><description>${escapeHtml(article.description)}</description><pubDate>${new Date(`${article.publishedAt}T00:00:00Z`).toUTCString()}</pubDate><category>${escapeHtml(article.category)}</category><author>${escapeHtml(article.author)}</author></item>`).join('\n    ')}
  </channel>
</rss>`;
}

function updateSitemap(articles) {
  const urls = [
    { loc: `${SITE_URL}/`, lastmod: new Date().toISOString().slice(0, 10) },
    { loc: `${SITE_URL}/blog/`, lastmod: new Date().toISOString().slice(0, 10) },
    ...articles.map(article => ({ loc: article.canonicalUrl, lastmod: article.updatedAt }))
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${url.loc}</loc><lastmod>${url.lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`;
  fs.writeFileSync('sitemap.xml', xml, 'utf8');
}

function archiveScript() {
  return `const search=document.getElementById('blog-search');const clear=document.getElementById('blog-clear');const filters=[...document.querySelectorAll('.blog-filter')];const cards=[...document.querySelectorAll('.article-card')];const empty=document.getElementById('blog-empty');let active='All';function apply(){const q=(search.value||'').trim().toLowerCase();let shown=0;cards.forEach(card=>{const text=[card.dataset.title,card.dataset.description,card.dataset.category,card.dataset.tags].join(' ').toLowerCase();const categoryOk=active==='All'||card.dataset.category===active;const searchOk=!q||text.includes(q);const visible=categoryOk&&searchOk;card.hidden=!visible;if(visible)shown++;});empty.hidden=shown!==0;}filters.forEach(btn=>btn.addEventListener('click',()=>{active=btn.dataset.category;filters.forEach(item=>item.classList.toggle('active',item===btn));apply();}));search.addEventListener('input',apply);clear.addEventListener('click',()=>{search.value='';search.focus();apply();});`;
}

function blogCss() {
  return `@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=Inter:wght@400;500;600;700&display=swap');*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 18% 8%,rgba(255,42,127,.18),transparent 34%),linear-gradient(180deg,#08080d,#050508 52%,#020204);color:#fff;font-family:Inter,Arial,sans-serif}a{color:inherit}.blog-page,.article-page{width:min(1180px,calc(100% - 32px));margin:0 auto;padding:28px 0 72px}.blog-header{display:flex;align-items:center;justify-content:space-between;gap:18px;min-height:54px}.brand,.back-link,.primary-link,.secondary-link{font-family:Inter,sans-serif;font-weight:700;text-decoration:none}.brand{letter-spacing:.04em}.back-link,.secondary-link{color:rgba(255,255,255,.7)}.blog-hero,.article-hero{padding:56px 0 36px}.micro{display:block;color:#ff2a7f;font-size:.75rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;margin-bottom:14px}h1{font-family:Outfit,sans-serif;font-size:clamp(2.6rem,7vw,6rem);line-height:.92;margin:0 0 20px}h2{font-family:Outfit,sans-serif}.blog-hero p,.article-hero p{max-width:760px;color:rgba(255,255,255,.68);font-size:1.08rem;line-height:1.7}.featured-article,.article-card,.article-cta{border:1px solid rgba(255,255,255,.16);border-radius:24px;background:rgba(255,255,255,.06);box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 20px 70px rgba(0,0,0,.28);overflow:hidden}.featured-article{display:grid;grid-template-columns:1fr 1fr;gap:0;margin-bottom:30px}.featured-article img,.card-media img,.article-hero img{width:100%;height:100%;object-fit:cover}.featured-article div{padding:34px}.primary-link,.secondary-link,.blog-filter,.search-row button{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:11px 18px;border-radius:999px;border:1px solid rgba(255,255,255,.18)}.primary-link{background:linear-gradient(135deg,#ff2a7f,#b32bf9);box-shadow:0 10px 34px rgba(255,42,127,.28)}.blog-controls{margin:28px 0}.blog-controls label{display:block;margin-bottom:10px;color:rgba(255,255,255,.78);font-weight:700}.search-row{display:flex;gap:10px}.search-row input{width:100%;min-height:48px;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(255,255,255,.07);color:#fff;padding:0 18px}.filter-row{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}.blog-filter{background:rgba(255,255,255,.07);color:rgba(255,255,255,.75);cursor:pointer}.blog-filter.active{background:rgba(255,42,127,.2);border-color:rgba(255,42,127,.55);color:#fff}.article-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.article-card{display:flex;flex-direction:column}.card-media{aspect-ratio:16/9;display:block}.card-copy{display:flex;flex:1;flex-direction:column;padding:22px}.card-meta,.article-meta{display:flex;flex-wrap:wrap;gap:8px;color:rgba(255,255,255,.58);font-size:.82rem}.card-meta span{padding:6px 9px;border-radius:999px;background:rgba(255,255,255,.08)}.card-copy h2{font-size:1.35rem;line-height:1.15}.card-copy h2 a{text-decoration:none}.card-copy p{color:rgba(255,255,255,.64);line-height:1.58}.card-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:auto;color:rgba(255,255,255,.58);font-size:.86rem}.article-shell{max-width:880px;margin:0 auto}.article-hero img{margin-top:28px;border-radius:24px;border:1px solid rgba(255,255,255,.16);aspect-ratio:16/9}.article-content{color:rgba(255,255,255,.82);font-size:1.05rem;line-height:1.85}.article-content h2{margin-top:42px;color:#fff}.article-content a{color:#ff7bbb}.article-toc,.article-sources,.related-articles{margin:28px 0;padding:22px;border:1px solid rgba(255,255,255,.14);border-radius:18px;background:rgba(255,255,255,.05)}.related-articles div{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.related-articles a{padding:16px;border-radius:14px;background:rgba(255,255,255,.06);text-decoration:none}.related-articles span{display:block;color:#ff7bbb;font-size:.78rem;margin-bottom:8px}.article-cta{margin-top:44px;padding:28px}.article-cta div{display:flex;gap:12px;flex-wrap:wrap}.empty-state{padding:26px;border:1px solid rgba(255,255,255,.16);border-radius:18px;color:rgba(255,255,255,.66)}:focus-visible{outline:2px solid #ff2a7f;outline-offset:3px}@media(max-width:980px){.article-grid{grid-template-columns:repeat(2,1fr)}.featured-article{grid-template-columns:1fr}.related-articles div{grid-template-columns:1fr}}@media(max-width:640px){.blog-page,.article-page{width:min(100% - 24px,620px)}.article-grid{grid-template-columns:1fr}.blog-header{align-items:flex-start;flex-direction:column}.search-row{flex-direction:column}.card-footer{align-items:flex-start;flex-direction:column}h1{font-size:clamp(2.4rem,14vw,4rem)}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}`;
}

if (process.argv[1] && process.argv[1].replaceAll('\\', '/').endsWith('/scripts/generate-blog.mjs')) {
  const result = generateBlog();
  console.log(`Generated blog with ${result.published.length} published article(s).`);
}
