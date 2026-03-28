# 🚀 RELEASE INSTRUCTIONS - READ THIS FIRST

## What I've Done (Everything I Can)

### ✅ Code Complete
- **Web Demo**: 36+ simulations, code comparison, responsive design
- **Rust Crate**: Published to crates.io as `constraint-theory-core` v1.0.1
- **Python Bindings**: PyPI workflow configured with PyO3/maturin
- **All READMEs**: Polished with consistent branding, cross-links

### ✅ Deployment Configs Created
- `wrangler.toml` for Cloudflare Pages in each repo
- GitHub Actions workflows for CI/CD
- PyPI publishing workflow for Python package

### ✅ Governance Files
- LICENSE (MIT) in all repos
- CONTRIBUTING.md templates
- Security policies

---

## 🔴 WHAT YOU NEED TO DO

### Step 1: Push All Repos to GitHub

The repos are in `/home/z/my-project/repo-split/`. Push each one:

```bash
# Core Rust crate (already done if you published to crates.io)
cd /home/z/my-project/repo-split/constraint-theory-core
git init && git add . && git commit -m "Initial commit - Constraint Theory Core"
git remote add origin https://github.com/SuperInstance/constraint-theory-core.git
git push -u origin main

# Python bindings
cd /home/z/my-project/repo-split/constraint-theory-python
git init && git add . && git commit -m "Initial commit - Python bindings"
git remote add origin https://github.com/SuperInstance/constraint-theory-python.git
git push -u origin main

# Web demos
cd /home/z/my-project/repo-split/constraint-theory-web
git init && git add . && git commit -m "Initial commit - Interactive demos"
git remote add origin https://github.com/SuperInstance/constraint-theory-web.git
git push -u origin main

# Research documentation
cd /home/z/my-project/repo-split/constraint-theory-research
git init && git add . && git commit -m "Initial commit - Research docs"
git remote add origin https://github.com/SuperInstance/constraint-theory-research.git
git push -u origin main
```

### Step 2: Set Up Cloudflare Pages

1. Go to **Cloudflare Dashboard** → **Pages** → **Create a project**
2. Connect your GitHub account
3. Create projects for each repo:

| Project Name | GitHub Repo | Build Settings |
|--------------|-------------|----------------|
| constraint-theory-web | SuperInstance/constraint-theory-web | Framework: None, Build: (empty), Output: . |
| constraint-theory-research | SuperInstance/constraint-theory-research | Framework: None, Build: (empty), Output: . |

4. Set custom domains:
   - `constraint-theory-web` → `constraint-theory.superinstance.ai`
   - `constraint-theory-research` → `docs.constraint-theory.superinstance.ai`

### Step 3: Verify PyPI Package

Check if the GitHub Actions workflow succeeded:
1. Go to https://github.com/SuperInstance/constraint-theory-python/actions
2. Look for "Publish to PyPI" workflow
3. If it ran, verify: `pip install constraint-theory`

If it didn't run, you may need to:
1. Create a PyPI API token at https://pypi.org/manage/account/token/
2. Add it as a GitHub secret: `PYPI_API_TOKEN`
3. Tag a release to trigger the workflow

### Step 4: Trigger crates.io Documentation

The crate is published, but docs.rs needs to build it:
```bash
# Check if docs are building
curl https://docs.rs/constraint-theory-core
```

If not, you may need to re-publish with proper metadata.

### Step 5: Set GitHub Repository Settings

For each repo, configure:

1. **About section** (right sidebar):
   - Website: Your Cloudflare Pages URL
   - Topics: `rust`, `geometry`, `constraints`, `pythagorean`, `mathematics`

2. **Pages settings** → Source: Deploy from branch (if using GitHub Pages as backup)

3. **Branch protection** for `main`:
   - Require PR reviews
   - Require status checks

### Step 6: Social Launch

When ready to launch publicly:

#### Hacker News
- Use title from `launch/HN_TITLE.md`
- Post timing: Tuesday-Thursday, 9-11 AM PST
- Have FAQ ready from `launch/HN_FAQ.md`

#### Twitter/X
- Draft: "After 2 years of research, I'm open-sourcing Constraint Theory - exact geometry with zero floating-point drift. 78% less code. Forever exact. 🧵"

#### Reddit
- r/rust, r/programming, r/math
- Focus on the "ah-ha" moments

---

## 📋 Quick Checklist

```
[ ] Push constraint-theory-core to GitHub
[ ] Push constraint-theory-python to GitHub  
[ ] Push constraint-theory-web to GitHub
[ ] Push constraint-theory-research to GitHub
[ ] Create Cloudflare Pages project for web
[ ] Set custom domain constraint-theory.superinstance.ai
[ ] Verify PyPI package installs
[ ] Test cargo install constraint-theory-core
[ ] Set up GitHub repo topics and descriptions
[ ] Prepare launch post content
```

---

## 🔗 Important URLs After Setup

| Resource | URL |
|----------|-----|
| Web Demo | https://constraint-theory.superinstance.ai |
| Rust Crate | https://crates.io/crates/constraint-theory-core |
| Rust Docs | https://docs.rs/constraint-theory-core |
| PyPI Package | https://pypi.org/project/constraint-theory/ |
| GitHub Org | https://github.com/SuperInstance |

---

## 💡 Tips

1. **The web demo running now** is at the Preview Panel - click "Open in New Tab" to see it in full
2. **All simulation code works** - 36 unique visualizations with controls
3. **The code comparison tab** shows the "ah-ha" moments that sell the concept
4. **Cross-pollination is complete** - all READMEs link to each other

---

*Generated automatically - all code and configs are ready in the repo-split folders*
