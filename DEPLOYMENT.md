# RSCP SDK Deployment Guide

This guide covers deploying the RSCP SDK and verification web app.

## Overview

| Component | Purpose | Deployment Target |
|-----------|---------|-------------------|
| `@rscp/core` | NPM package for developers | npm registry |
| `verification-web` | Certificate verification page | rscp.autoviatest.com |

---

## Part 1: Publish SDK to NPM

### Prerequisites
- Node.js 18+
- npm account (https://www.npmjs.com/signup)

### Step 1: Login to NPM
```bash
npm login
# Enter username, password, email, and OTP if 2FA enabled
```

### Step 2: Build the SDK
```bash
cd /Users/pawan/WebstormProjects/rscp-sdk
cd packages/core
npm run build
```

### Step 3: Verify Package Contents
```bash
npm pack --dry-run
# Check that only necessary files are included
```

### Step 4: Publish to NPM
```bash
# For first publish:
npm publish --access public

# For updates:
npm version patch  # or minor/major
npm publish
```

### Step 5: Verify Publication
```bash
npm info @rscp/core
# Or visit: https://www.npmjs.com/package/@rscp/core
```

---

## Part 2: Deploy Verification Web App

### Option A: Vercel (Recommended - Free)

#### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

#### Step 2: Login to Vercel
```bash
vercel login
# Follow browser prompts
```

#### Step 3: Deploy
```bash
cd /Users/pawan/WebstormProjects/rscp-sdk/apps/verification-web
vercel --prod
```

#### Step 4: Set Custom Domain
1. Go to https://vercel.com/dashboard
2. Select the project
3. Go to Settings → Domains
4. Add `rscp.autoviatest.com`
5. Copy the DNS records shown

#### Step 5: Configure DNS
In your domain registrar (where autoviatest.com is registered):
```
Type: CNAME
Name: rscp
Value: cname.vercel-dns.com
```

Wait 5-10 minutes for DNS propagation.

---

### Option B: Netlify (Free)

#### Step 1: Install Netlify CLI
```bash
npm install -g netlify-cli
```

#### Step 2: Login to Netlify
```bash
netlify login
```

#### Step 3: Deploy
```bash
cd /Users/pawan/WebstormProjects/rscp-sdk/apps/verification-web
netlify deploy --prod --dir=dist
```

#### Step 4: Set Custom Domain
1. Go to https://app.netlify.com
2. Select Site settings → Domain management
3. Add `rscp.autoviatest.com`
4. Follow DNS instructions

---

### Option C: GitHub Pages (Free)

#### Step 1: Create GitHub Repository
```bash
cd /Users/pawan/WebstormProjects/rscp-sdk
gh repo create rscp-sdk --public --source=. --push
```

#### Step 2: Enable GitHub Pages
1. Go to repository Settings → Pages
2. Source: GitHub Actions

#### Step 3: Create Workflow File
Create `.github/workflows/deploy-verification.yml`:
```yaml
name: Deploy Verification Web

on:
  push:
    branches: [main]
    paths:
      - 'apps/verification-web/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install and Build
        run: |
          cd apps/verification-web
          npm install
          npm run build

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./apps/verification-web/dist
```

#### Step 4: Configure Custom Domain
1. Add file `apps/verification-web/public/CNAME`:
   ```
   rscp.autoviatest.com
   ```
2. Configure DNS:
   ```
   Type: CNAME
   Name: rscp
   Value: <username>.github.io
   ```

---

### Option D: Manual Server (VPS/Cloud)

#### Using nginx:
```bash
# Copy dist folder to server
scp -r apps/verification-web/dist/* user@server:/var/www/rscp/

# nginx config (/etc/nginx/sites-available/rscp)
server {
    listen 80;
    server_name rscp.autoviatest.com;
    root /var/www/rscp;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## Part 3: Push Code to GitHub

### Step 1: Create Repository
```bash
cd /Users/pawan/WebstormProjects/rscp-sdk

# Using GitHub CLI
gh repo create rscp-sdk --public --description "RSCP - Road Safety Certification Protocol SDK"

# Or using git
git remote add origin https://github.com/YOUR_USERNAME/rscp-sdk.git
```

### Step 2: Push Code
```bash
git push -u origin main
```

---

## Part 4: DNS Configuration Summary

Add these records in your domain registrar for `autoviatest.com`:

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| CNAME | rscp | cname.vercel-dns.com | Verification web app |

---

## Quick Reference

### Local Development
```bash
# SDK
cd packages/core && npm run build && npm test

# Verification Web
cd apps/verification-web && npm run dev
# Opens http://localhost:5173

# Test URL
http://localhost:5173/verify?cert=RS-2026-G-IN-ATV-000001-4&code=FWWZUFEJ
```

### Production URLs
- SDK: https://www.npmjs.com/package/@rscp/core
- Verification: https://rscp.autoviatest.com/verify?cert=...&code=...

---

## Troubleshooting

### NPM Publish Fails
```bash
# Check if logged in
npm whoami

# Check package name availability
npm view @rscp/core

# If name taken, update package.json name
```

### DNS Not Working
- Wait 15-30 minutes for propagation
- Check with: `dig rscp.autoviatest.com`
- Verify CNAME is correct

### Vercel Deploy Fails
```bash
# Check build locally first
npm run build

# View logs
vercel logs
```
