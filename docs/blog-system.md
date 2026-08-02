# ESY Blog System

## Architecture

The site remains a static HTML/CSS/JavaScript project. The blog is file-based: Markdown files in `content/blog/` are parsed at build time and generated into static pages under `blog/`.

## Folder Structure

- `content/blog/`: Markdown articles with YAML front matter.
- `data/blog-index.json`: generated public index used by the home-page Blog panel.
- `data/blog-sources.json`: approved source configuration for Content Radar.
- `assets/images/blog/generated/`: generated SVG covers.
- `blog/`: generated archive, RSS feed, and article pages.
- `scripts/`: blog generation, validation, cover generation, tests, and Content Radar.
- `.github/workflows/`: blog validation and Content Radar automation.

## How Articles Become Cards

`npm run blog:generate` scans `content/blog/`, validates front matter, excludes drafts and archived articles, generates covers, writes `data/blog-index.json`, and updates the Blog panel data source.

## Article Pages

Each published article becomes `/blog/[slug]/index.html` with SEO metadata, Open Graph tags, Twitter metadata, structured Article data, breadcrumbs, source list, related articles, and Contact/Services CTAs.

## SVG Covers

`npm run blog:cover` generates 1200x675 SVG covers with dark graphite background, magenta/violet lighting, category indicator, original vector visual, title, and ESY TECH CREATIVE text. No paid API is used by default.

## Local Commands

- `npm run blog:generate`: generate covers, index, archive, article pages, RSS, and sitemap.
- `npm run blog:validate`: validate article schema and generated covers.
- `npm run blog:cover`: regenerate SVG covers.
- `npm run blog:preview`: serve the static site at `http://localhost:3000`.
- `npm run blog:radar:dry-run`: run Content Radar without creating a PR.
- `npm test`: run local blog tests.
- `npm run build`: generate and test the blog.

## Manual Article Creation

Run:

```powershell
node scripts/create-article-draft.mjs "Article title"
```

Review the created Markdown file, add sources, keep `status: "draft"` until approval, then run `npm run build`.

## Content Radar

The Content Radar runs in GitHub Actions only. It reads `data/blog-sources.json`, checks existing content, proposes at most one draft, generates a cover, validates content, creates a branch, and opens a Pull Request. It never merges its own PR and never publishes directly to `main`.

## Manual Radar Run

Use GitHub Actions > Content Radar > Run workflow. Start with `dry_run=true`. For a real proposal, use `dry_run=false` after confirming repository permissions.

## Required GitHub Secrets

- `OPENAI_API_KEY`: optional for future server-side article assistance. Not required for SVG cover generation.

`GITHUB_TOKEN` is provided by GitHub Actions automatically for PR creation.

## Approved Sources

Edit `data/blog-sources.json`. Leave sources disabled when a reliable endpoint is not verified. Do not invent RSS URLs.

## Review and Publish Procedure

1. Review article and source links.
2. Review generated SVG cover.
3. Confirm no duplicate topic exists.
4. Change `status: "draft"` to `status: "published"`.
5. Run `npm run build`.
6. Merge the Pull Request.
7. Vercel deploys the approved static files.

## Rejecting a Draft

Close the Pull Request without merging. Delete the branch if no longer needed.

## Updating an Existing Article

Edit the existing Markdown file, update `updatedAt`, run `npm run build`, and submit a normal Pull Request.

## Optional AI Image Generation

The default image provider is SVG:

```text
BLOG_IMAGE_PROVIDER=svg
```

Future OpenAI image support must run only server-side in GitHub Actions or another trusted environment with `OPENAI_API_KEY` in secrets. Never expose keys in browser code. Generated images should be committed for human review in a Pull Request. API cost depends on the provider/model selected at that future time.

## Troubleshooting

- If cards do not appear, run `npm run blog:generate` and confirm `data/blog-index.json` exists.
- If an article is missing, confirm `status: "published"`.
- If validation fails, read the exact field error from `npm run blog:validate`.
- If GitHub Actions reports drift, run `npm run blog:generate` locally and commit generated files.
