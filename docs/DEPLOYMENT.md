# Deploying Browser AI Lab to browserailab.in

This runbook moves the site from `browser-ai-lab.vercel.app` (Vite, hash URLs) to `https://browserailab.in` (Next.js, real URLs) without breaking existing links. Follow the steps in order: the domain redirect stays off until the new domain works.

## 1. Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable | Production | Preview | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://browserailab.in` | `https://browserailab.in` | Canonical URLs, sitemap, JSON-LD, social cards. Keep the production value on previews too, so previews never declare themselves canonical. |
| `ENABLE_DOMAIN_REDIRECTS` | `false` at first, then `true` (step 4) | `false` | 308-redirects `LEGACY_HOSTS` to the canonical domain. |
| `LEGACY_HOSTS` | `browser-ai-lab.vercel.app,www.browserailab.in` | — | Hosts to redirect. |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | optional | — | Only for the HTML-tag verification method. |
| `NEXT_PUBLIC_BING_SITE_VERIFICATION` | optional | — | Only for Bing's meta-tag method. |
| `NEXT_PUBLIC_GA_ID` | optional (`G-XXXXXXX`) | leave empty | GA4. Leave empty for no analytics. When set, a consent banner asks first. |

`VERCEL_ENV` is set by Vercel automatically. Preview deployments get `noindex` and a disallow-all `robots.txt`; production is indexable.

`NEXT_PUBLIC_*` values are baked in at build time, so redeploy after changing them.

## 2. Framework and build

`vercel.json` pins `"framework": "nextjs"`, which overrides the old Vite preset (and its `dist` output directory) left in the project settings. Install and build commands can stay at their defaults (`npm install`, `next build`). Node 20.9+ is required; Vercel's default Node 22 is fine.

Deploy the `next-migration` branch as a **preview** first and check it (see section 6) before merging to `main`.

> `.github/workflows/deploy.yml` (GitHub Pages) expects a Vite `dist/` folder and **will fail** once this is merged. The new app relies on server redirects and real 404s, which GitHub Pages can't provide. Delete or disable that workflow if Vercel is the only host.

## 3. Add the domain (Vercel → Project → Settings → Domains)

1. Add `browserailab.in` and set it as the **primary** domain for Production.
2. Add `www.browserailab.in` and choose **Redirect to `browserailab.in`** (308).
3. Keep `browser-ai-lab.vercel.app` attached to the project. It must keep serving the app so step 4's redirect can run.
4. At your DNS provider, create the records Vercel shows. Typically:
   - apex `browserailab.in`: `A` record → `76.76.21.21`
   - `www`: `CNAME` → `cname.vercel-dns.com`

   (Or move the nameservers to Vercel. Always use the exact values the Domains page displays.)
5. Wait until the Domains page shows **Valid Configuration** and the certificate is issued. Check that `https://browserailab.in` loads over HTTPS.

## 4. Turn on the old-domain redirect

Only after step 3 works: set `ENABLE_DOMAIN_REDIRECTS=true` for Production and redeploy. Then:

- `https://browser-ai-lab.vercel.app/<anything>` → **308** → `https://browserailab.in/<anything>`.
- Old hash links such as `https://browser-ai-lab.vercel.app/#/cutout` keep their fragment through the 308. The layout script then sends them to `/tools/background-remover`. Fragments never reach a server, so a client-side hop is the only possible mapping. Crawlers only ever indexed the old home page, so no ranking value sits on those fragments.
- Path redirects (always on): `/cutout`, `/music-studio` and every other old tool ID go to `/tools/<new-slug>` with a 308. See `src/tools/slugs.ts` for the full map.

Check that there are no chains (one hop each):

```bash
curl -sI https://browser-ai-lab.vercel.app/tools/merge-pdf | grep -i -E '^(HTTP|location)'
curl -sI https://www.browserailab.in/ | grep -i -E '^(HTTP|location)'
curl -sI https://browserailab.in/cutout | grep -i -E '^(HTTP|location)'
```

## 5. Google Search Console

1. Go to https://search.google.com/search-console and **Add property → Domain** → `browserailab.in`.
2. Add the `TXT` record Google shows to your DNS (a Domain property covers http/https and www in one go). Alternatively use a URL-prefix property with the HTML tag and put the token in `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`.
3. **Sitemaps** → submit `https://browserailab.in/sitemap.xml` (68 URLs).
4. If you had a property for `browser-ai-lab.vercel.app`, open it and use **Change of address**. This only works when you own both as verified properties and the 308s are live; if you can't verify a `vercel.app` prefix property, skip it.
5. **URL Inspection** → test a few pages (home, `/tools/vocal-remover`, `/tools/background-remover`) → **Request indexing**.
6. Over the next weeks, watch **Pages** (indexing) and **Enhancements**. Breadcrumbs should validate. No rich results are expected for the WebApplication markup, because Google requires ratings or reviews for those and the site has none.

## 6. Bing Webmaster Tools

At https://www.bing.com/webmasters, either **Import from Google Search Console** (quickest) or add the site and verify with `NEXT_PUBLIC_BING_SITE_VERIFICATION`. Submit the sitemap.

## 7. Post-launch checks

```bash
curl -s https://browserailab.in/robots.txt            # Allow: / + Sitemap line
curl -s https://browserailab.in/sitemap.xml | grep -c '<loc>'   # 68
curl -s https://browserailab.in/tools/merge-pdf | grep -o '<link rel="canonical"[^>]*>'
curl -sI https://browserailab.in/tools/nope | head -1  # 404
```

- Rich Results Test: https://search.google.com/test/rich-results (check a tool page and a guide).
- PageSpeed Insights: https://pagespeed.web.dev for real-user Core Web Vitals once there's traffic.
- Social card previews: share a tool URL in LinkedIn's Post Inspector to refresh its cache.
