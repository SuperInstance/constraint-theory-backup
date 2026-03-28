# 🚀 Cloudflare Pages Setup Instructions

## All Repos Pushed to GitHub ✅

| Repo | GitHub URL |
|------|------------|
| constraint-theory-core | https://github.com/SuperInstance/constraint-theory-core |
| constraint-theory-python | https://github.com/SuperInstance/constraint-theory-python |
| constraint-theory-web | https://github.com/SuperInstance/constraint-theory-web |
| constraint-theory-research | https://github.com/SuperInstance/constraint-theory-research |
| constraint-ranch | https://github.com/SuperInstance/constraint-ranch |
| constraint-flow | https://github.com/SuperInstance/constraint-flow |

---

## 🔴 WHAT YOU NEED TO DO: Cloudflare Pages Setup

### Step 1: Go to Cloudflare Dashboard

1. Open: https://dash.cloudflare.com/
2. Login with your account
3. Click **"Pages"** in the left sidebar

### Step 2: Connect GitHub

1. Click **"Create a project"**
2. Select **"Connect to Git"**
3. Choose **"GitHub"** as your Git provider
4. Authorize Cloudflare to access your GitHub account
5. Select **"Only select repositories"**
6. Check these repos:
   - `constraint-theory-web`
   - `constraint-theory-research`
   - `constraint-ranch`
   - `constraint-flow`

### Step 3: Create Each Pages Project

For each repo, create a Pages project:

#### constraint-theory-web
1. Select `constraint-theory-web` repo
2. Project name: `constraint-theory-web`
3. Production branch: `main`
4. Build settings:
   - Framework preset: **None**
   - Build command: **(leave empty)**
   - Build output directory: `.` (just a dot)
5. Click **"Save and Deploy"**

#### constraint-theory-research
1. Select `constraint-theory-research` repo
2. Project name: `constraint-theory-research`
3. Production branch: `main`
4. Build settings:
   - Framework preset: **None**
   - Build command: **(leave empty)**
   - Build output directory: `.`
5. Click **"Save and Deploy"**

#### constraint-ranch (future)
- Same steps, project name: `constraint-ranch`

#### constraint-flow (future)
- Same steps, project name: `constraint-flow`

### Step 4: Set Custom Domains

After deployment completes:

1. Go to your project → **Custom domains**
2. Click **"Set up a custom domain"**

| Project | Custom Domain |
|---------|---------------|
| constraint-theory-web | `constraint-theory.superinstance.ai` |
| constraint-theory-research | `docs.constraint-theory.superinstance.ai` |
| constraint-ranch | `constraint-ranch.superinstance.ai` |
| constraint-flow | `constraint-flow.superinstance.ai` |

3. Cloudflare will automatically configure DNS

---

## Alternative: GitHub Pages (Simpler)

If you prefer GitHub Pages instead:

1. Go to each repo → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` / `(root)`
4. Save

Your sites will be at:
- `https://superinstance.github.io/constraint-theory-web/`
- `https://superinstance.github.io/constraint-theory-research/`
- etc.

---

## 🟢 After Setup - Verify

1. **Web Demo**: Visit your domain and try the simulations
2. **Research Docs**: Check that docs render correctly
3. **Test PyPI**: `pip install constraint-theory`
4. **Test Cargo**: `cargo add constraint-theory-core`

---

## Quick Commands for Cloudflare CLI (Optional)

If you have `wrangler` installed:

```bash
# Install wrangler
npm install -g wrangler

# Login
wrangler login

# Deploy directly
cd /home/z/my-project/repo-split/constraint-theory-web
wrangler pages deploy . --project-name constraint-theory-web

cd /home/z/my-project/repo-split/constraint-theory-research
wrangler pages deploy . --project-name constraint-theory-research
```

---

## Summary

**What I did:**
- ✅ Pushed all 6 repos to GitHub
- ✅ Synced with latest remote changes
- ✅ All READMEs and code are up to date

**What you need to do:**
1. Go to Cloudflare Dashboard → Pages
2. Connect GitHub and select repos
3. Create Pages projects (no build needed - static files)
4. Set custom domains

**The web demo is running now** - check the Preview Panel!
