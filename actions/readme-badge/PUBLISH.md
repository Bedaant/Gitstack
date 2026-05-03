# How to Publish gitstack-readme-badge to GitHub Marketplace

## Step 1: Create a new public repo on GitHub
Repo name: `GitStackHQ/gitstack-readme-badge` (or any public org/repo you own)

## Step 2: Push the action files

From this directory (d:\Gitstack\actions\readme-badge):

```bash
# 1. Init fresh repo in this folder
git init
git checkout -b main

# 2. Add everything (except node_modules/ which is gitignored)
git add action.yml README.md package.json index.js dist/ .gitignore

# 3. Commit
git commit -m "Initial release: v1.0.0"

# 4. Add remote (replace with your actual repo)
git remote add origin https://github.com/GitStackHQ/gitstack-readme-badge.git

# 5. Push
git push -u origin main

# 6. Tag for release
git tag v1.0.0
git tag v1
git push origin v1.0.0
git push origin v1
```

## Step 3: Publish to GitHub Marketplace

1. Go to your new repo on GitHub
2. Click **Releases** → **Create a new release**
3. Under **Choose a tag**, select **v1.0.0**
4. Release title: `GitStack README Badge v1.0.0`
5. Check the box: **"Publish this Action to the GitHub Marketplace"**
6. Click **Publish release**

## Step 4: Verify it works

Create a test repo, add this file as `.github/workflows/test-badge.yml`:

```yaml
name: Test GitStack Badge
on: workflow_dispatch
permissions:
  contents: write
jobs:
  badge:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: GitStackHQ/gitstack-readme-badge@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

Then trigger the workflow manually in GitHub UI → **Actions** tab → **Test GitStack Badge** → **Run workflow**.

The action should create a `README.md` with the GitStack badges, or append to an existing one.

## Maintenance

When you update the action:
```bash
git add .
git commit -m "fix: updated badge colors"
git tag v1.1.0
git push origin main
git push origin v1.1.0
```

Then draft a new release on GitHub for v1.1.0. The `v1` tag can be force-updated to point to the latest release.
