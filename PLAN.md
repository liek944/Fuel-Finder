# Fuel Finder SEO Implementation Plan

This plan outlines step-by-step actions to improve Google indexing and organic visibility. It is designed for incremental implementation with clear owners, prerequisites, and definitions of done (DoD).

---

## Goals
- Ensure Google can crawl and index the site reliably.
- Provide search engines with strong signals (sitemap, canonical, metadata, structured data).
- Add crawlable text content to complement the map UI.
- Consolidate domain signals and avoid duplicates.
- Monitor indexing status and address issues proactively.

---

## Current State (Audit Summary)
- robots.txt: Present but minimal; no `Sitemap:` directive.
- sitemap.xml: Missing.
- Meta tags: Title and description exist. Missing canonical, Open Graph (OG), Twitter Card, and JSON-LD.
- SPA routing: Netlify-style fallback present (`/_redirects` → `/* /index.html 200`).
- No explicit noindex found (no meta robots or X-Robots-Tag).
- Service worker: Minimal; does not hijack navigation or cache offline content—OK.
- Content: Homepage is map-first; limited crawlable text.

---

## Inputs Needed
- Canonical domain (final production URL), e.g. `https://<your-domain>`.
- Which paths to exclude from indexing (recommended: `/admin`, `/owner/`).
- Approval to add a simple About page with crawlable text.

---

## Phase 1 — Baseline Crawlability (High Priority)

- [ ] Confirm canonical domain
  - Owner: Project owner
  - Steps:
    - Decide the primary host: e.g., `https://fuelfinder.com` or `https://<project>.netlify.app`.
    - Ensure only one host is primary (www vs non-www). Prefer 301 redirects from alternates to canonical.
  - DoD: A single canonical URL is defined and documented here.

- [ ] Add sitemap.xml (static)
  - Owner: Dev
  - Files: `frontend/public/sitemap.xml`
  - Steps:
    - Create a basic XML listing at least: `/`, `/about` (once created), `/privacy` (if present).
    - Example skeleton (replace domain):
      ```xml
      <?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://<your-domain>/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
        <url><loc>https://<your-domain>/about</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
      </urlset>
      ```
  - DoD: `sitemap.xml` is live at `https://<your-domain>/sitemap.xml`.

- [ ] Update robots.txt
  - Owner: Dev
  - Files: `frontend/public/robots.txt`
  - Steps:
    - Keep crawl open; add `Sitemap:`.
    - Optionally disallow private UIs:
      ```
      User-agent: *
      Allow: /
      Disallow: /admin
      Disallow: /owner/
      Sitemap: https://<your-domain>/sitemap.xml
      ```
  - DoD: `robots.txt` served publicly with correct `Sitemap:` URL.

- [ ] Add canonical + social meta to `<head>`
  - Owner: Dev
  - Files: `frontend/index.html`
  - Steps:
    - Add canonical link:
      ```html
      <link rel="canonical" href="https://<your-domain>/" />
      ```
    - Add Open Graph:
      ```html
      <meta property="og:type" content="website" />
      <meta property="og:title" content="Fuel Finder" />
      <meta property="og:description" content="An Online Fuel Station Locator and Navigation Web-App for Oriental Mindoro, Philippines" />
      <meta property="og:url" content="https://<your-domain>/" />
      <meta property="og:image" content="https://<your-domain>/logo512.png" />
      ```
    - Add Twitter Card:
      ```html
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Fuel Finder" />
      <meta name="twitter:description" content="An Online Fuel Station Locator and Navigation Web-App for Oriental Mindoro, Philippines" />
      <meta name="twitter:image" content="https://<your-domain>/logo512.png" />
      ```
  - DoD: Tags present; page source shows canonical/OG/Twitter correctly.

- [ ] Add JSON-LD structured data
  - Owner: Dev
  - Files: `frontend/index.html`
  - Steps:
    - Add Organization and WebApplication schema:
      ```html
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Fuel Finder",
        "url": "https://<your-domain>/",
        "logo": "https://<your-domain>/logo512.png",
        "areaServed": "PH"
      }
      </script>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "Fuel Finder",
        "url": "https://<your-domain>/",
        "applicationCategory": "UtilitiesApplication",
        "operatingSystem": "Web",
        "offers": {"@type": "Offer", "price": "0"}
      }
      </script>
      ```
  - DoD: JSON-LD validates in Rich Results Test.

- [ ] Add crawlable text content
  - Owner: Dev + Content
  - Files: `frontend/src/components/MainApp.tsx` (light section) or separate `/about` route (preferred)
  - Steps:
    - Add an “About Fuel Finder” section or a dedicated `/about` page with:
      - H1 + 2–5 paragraphs explaining the app, area served, features (routing via OSRM, station prices, etc.).
      - Internal links from homepage (footer/header) to `/about`.
  - DoD: Page renders static, crawlable text; linked in navigation or footer.

---

## Phase 2 — Search Console & Indexing (High)
- [ ] Verify property in Google Search Console (URL-prefix or Domain)
- [ ] Submit `sitemap.xml` in Sitemaps
- [ ] Use URL Inspection to “Request indexing” for homepage and `/about`
- [ ] Review Coverage for any blocked/soft-404 or JS rendering issues

---

## Phase 3 — Domain Consolidation (High)
- [ ] Choose one canonical host (www vs non-www; Netlify subdomain vs custom domain)
- [ ] Add 301 redirects from alternates to canonical
- [ ] Ensure canonical tags reflect the chosen host

---

## Phase 4 — Enhancements (Medium)
- [ ] Core Web Vitals
  - Optimize LCP (hero text/image), preconnect to tile/CDN origins, lazy-load heavy assets.
- [ ] Accessibility & semantics
  - Ensure alt text for images and semantic headings.
- [ ] Additional structured data (optional)
  - BreadcrumbList for content pages if multiple exist later.

---

## Phase 5 — Backlinks & Citations (Low)
- [ ] Seed initial quality backlinks: GitHub README, LinkedIn post, Facebook page, local directories, school/department page.
- [ ] Encourage mentions from partner businesses or local forums.

---

## Phase 6 — Monitoring & Maintenance (Ongoing)
- [ ] Weekly: Check Search Console Coverage and Enhancements.
- [ ] After each deploy: Spot-check page source for canonical/OG/Twitter and Lighthouse for SEO.
- [ ] Quarterly: Refresh sitemap, review content for freshness and search intent.

---

## Implementation Details (Files to Change)
- Add: `frontend/public/sitemap.xml`
- Update: `frontend/public/robots.txt`
- Update: `frontend/index.html` (canonical, OG, Twitter, JSON-LD)
- Add: `/about` route + link from homepage/footer (optional but recommended)

---

## Risks & Mitigations
- SPA soft-404: Provide at least one static content page and ensure homepage has crawlable text.
- Duplicate hosts: Add canonical + 301 redirects to consolidate signals.
- Private routes indexed: Disallow `/admin` and `/owner/` in robots.txt and/or add `noindex` on those pages if needed.

---

## Rollout & DoD Checklist
- [ ] Plan approved with canonical domain decided
- [ ] Phase 1 changes merged and deployed
- [ ] Sitemap submitted in GSC
- [ ] URL Inspection requested (home + about)
- [ ] Coverage shows valid pages indexed
- [ ] Baseline backlinks added
