# Deploying Browser AI Lab (www.browserailab.com)

The canonical origin is **`https://www.browserailab.com`**. The apex `browserailab.com` and the old `browser-ai-lab.vercel.app` should both 308-redirect to it. Canonical tags, the sitemap, `robots.txt`, JSON-LD and social cards are all generated from `NEXT_PUBLIC_SITE_URL`, and the code falls back to `https://www.browserailab.com` if it is unset.

## 1. Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable | Production | Preview | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://www.browserailab.com` | `https://www.browserailab.com` | Canonical URLs, sitemap, JSON-LD, social cards. Use the production value on previews too, so previews never declare themselves canonical. |
| `ENABLE_DOMAIN_REDIRECTS` | `true` | `false` | 308-redirects `LEGACY_HOSTS` to the canonical domain. |
| `LEGACY_HOSTS` | `browser-ai-lab.vercel.app,browserailab.com` | — | Hosts to redirect (the default if unset). |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | optional | — | Only for the HTML-tag verification method. |
| `NEXT_PUBLIC_BING_SITE_VERIFICATION` | optional | — | Only for Bing's meta-tag method. |
| `NEXT_PUBLIC_GA_ID` | optional (`G-XXXXXXX`) | leave empty | GA4. Empty means no analytics. When set, a consent banner asks first. |

`VERCEL_ENV` is set by Vercel. Preview deployments get `noindex` and a disallow-all `robots.txt`; production is indexable.

`NEXT_PUBLIC_*` values are baked in at build time: **redeploy after changing them**.

## 2. Framework and build

`vercel.json` pins `"framework": "nextjs"`, which overrides any leftover Vite preset or `dist` output directory. Install and build commands stay at their defaults. Node 20.9+ is required.

> `.github/workflows/deploy.yml` (GitHub Pages) expects a Vite `dist/` folder and fails with the Next.js app. Delete or disable it if Vercel is the only host.

## 3. Domains (Vercel → Project → Settings → Domains)

- `www.browserailab.com`: **primary** production domain.
- `browserailab.com`: **Redirect to `www.browserailab.com`** (308). This is already live.
- `browser-ai-lab.vercel.app`: keep it attached so `ENABLE_DOMAIN_REDIRECTS` can 308 it to the canonical domain.

Old hash links such as `https://browser-ai-lab.vercel.app/#/cutout` keep their fragment through the 308. The layout script then sends them to `/tools/background-remover`. Old path IDs (`/cutout`, `/music-studio`…) always 308 to `/tools/<new-slug>` (see `src/tools/slugs.ts`).

Check for single-hop redirects:

```bash
curl -sI https://browserailab.com/tools/merge-pdf | grep -iE '^(HTTP|location)'
curl -sI https://browser-ai-lab.vercel.app/tools/merge-pdf | grep -iE '^(HTTP|location)'
curl -sI https://www.browserailab.com/cutout | grep -iE '^(HTTP|location)'
```

## 4. Google Search Console

1. Use a **Domain** property for `browserailab.com` (verified by a DNS `TXT` record; it covers www and apex, http and https). A URL-prefix property for `https://www.browserailab.com/` also works.
2. **Sitemaps** → submit `https://www.browserailab.com/sitemap.xml` (68 URLs). If an older submission shows "Couldn't fetch", remove it and submit again after the fixed build is deployed.
3. **URL Inspection** → test `https://www.browserailab.com/sitemap.xml` and a few pages (home, `/tools/vocal-remover`) → **Request indexing**. The "User-declared canonical" must be the `https://www.browserailab.com/...` URL itself.
4. Processing a sitemap can take from minutes to a few days. "Couldn't fetch" often clears on its own once Google retries a working sitemap.
5. Over the following weeks, watch **Pages** and **Enhancements** (breadcrumbs). No rich results are expected for the WebApplication markup: Google needs ratings or reviews for those, and the site has none.

## 5. Bing Webmaster Tools

At https://www.bing.com/webmasters, **Import from Google Search Console**, or add the site and verify with `NEXT_PUBLIC_BING_SITE_VERIFICATION`. Submit the same sitemap.

## 6. Post-deploy checks

```bash
UA='Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
curl -sI -A "$UA" https://www.browserailab.com/sitemap.xml | grep -iE '^(HTTP|content-type)'   # 200, application/xml
curl -s  -A "$UA" https://www.browserailab.com/sitemap.xml | grep -c '<loc>https://www.browserailab.com'   # 68
curl -s  -A "$UA" https://www.browserailab.com/robots.txt   # Allow: / + Sitemap: https://www.browserailab.com/sitemap.xml
curl -s  -A "$UA" https://www.browserailab.com/tools/merge-pdf | grep -o '<link rel="canonical"[^>]*>'
curl -sI https://www.browserailab.com/tools/nope | head -1  # 404
```

- Rich Results Test: https://search.google.com/test/rich-results
- PageSpeed Insights: https://pagespeed.web.dev
