# Adyen Payment Method Info Dashboard

Auto-updated dashboard showing settlement currency, processing currency, settlement delay, and sales day payout support for all Adyen payment methods.

## How it works

1. **Build time**: The build script fetches the Adyen sitemap, discovers all payment method pages, scrapes settlement info from each, and generates a static HTML page.
2. **Daily refresh**: A Netlify scheduled function triggers a rebuild every day at 6:00 AM UTC via a build hook.

## Deploy to Netlify

### Option A: Drag & drop
1. Run `npm run build` locally
2. Drag the `public/` folder to [Netlify Drop](https://app.netlify.com/drop)

### Option B: Git-based deploy (recommended for auto-refresh)
1. Push this folder to a Git repo (GitHub/GitLab)
2. Connect the repo to Netlify
3. Netlify will auto-detect `netlify.toml` and use the build settings

### Set up daily auto-refresh
1. In Netlify dashboard → **Site settings** → **Build & deploy** → **Build hooks**
2. Create a new build hook (name it "daily-refresh")
3. Copy the hook URL
4. Go to **Site settings** → **Environment variables**
5. Add: `BUILD_HOOK_URL` = the hook URL you just copied
6. The scheduled function will trigger a rebuild every day at 6:00 AM UTC

## Local development

```bash
npm run build        # Fetch data + generate HTML
open public/index.html
```

## Project structure

```
adyen-pm-info-site/
├── netlify.toml              # Netlify build config
├── netlify/functions/        # Netlify scheduled functions
│   └── scheduled-rebuild.mjs # Daily rebuild trigger
├── package.json
├── scripts/
│   ├── build.js              # Orchestrator: fetch → generate
│   ├── fetchData.js          # Scrapes Adyen payment method pages
│   └── generateHtml.js       # Generates static HTML from CSV
├── data/                     # Generated at build time
│   ├── all_payment_method_info.csv
│   └── all_payment_method_info.json
└── public/                   # Netlify publish directory
    └── index.html            # The dashboard
```
