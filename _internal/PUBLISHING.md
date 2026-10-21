# Publishing a change: git and production

Short version for any agent working on purebaric.com. The full detail is in `_internal/RUNBOOK.md` §5a. Read this before your first push or deploy.

**Two facts that trip people up**

1. **Pushing to GitHub does not deploy anything.** The Netlify site is not linked to the repo. The only thing that publishes to purebaric.com is a manual `netlify deploy --prod` run from this machine, in this folder.
2. **The `gh` CLI has two GitHub accounts.** The default is `bailie_adobe` (work). The repo lives under `matthewbailie` (personal). If the wrong one is active, `git push` and `git fetch` say `remote: Repository not found`. Switch before every git network operation and switch back after.

## Steps, in order

Work from `/Users/bailie/projects/purebaric-newsite` on branch `main`.

```bash
cd /Users/bailie/projects/purebaric-newsite
```

**1. Make sure you are on main and up to date.**

```bash
gh auth switch --user matthewbailie && git fetch -q origin && git merge --ff-only origin/main; gh auth switch --user bailie_adobe
```

If you worked on a branch or a pull request, merge it into `main` first. Production is deployed from the local working tree, so whatever is checked out is what goes live.

**2. Run the tests.** Netlify runs them too and refuses the deploy if any fail.

```bash
npm test
```

**3. Deploy to production** (once per batch of changes, not after every edit; Netlify bills per deploy).

```bash
netlify deploy --prod --dir .
```

If you changed anything under `netlify/functions/` (including `_lib` or `_data`), use this instead so the old function bundle is not reused:

```bash
netlify deploy --prod --dir . --skip-functions-cache
```

The command prints a "Website URL" when it finishes. Open https://purebaric.com and check the change is there.

**4. Commit and push.** Add files by name. Never `git add -A` or `git add .` (a design tool writes into `design-previews/` outside git's knowledge and a blanket add sweeps it in).

```bash
git config user.email
```

That must print `matthewbailie@gmail.com`. If it prints an Adobe address, stop and fix it with `git config user.email matthewbailie@gmail.com` before committing. Then:

```bash
git add index.html netlify/functions/foo.js   # the files you touched
git status --short                            # confirm nothing unexpected is staged
git commit -m "One line saying what changed and why"
gh auth switch --user matthewbailie && git push origin main; gh auth switch --user bailie_adobe
```

## If something goes wrong

- `remote: Repository not found` → wrong account. `gh auth switch --user matthewbailie`, retry, then switch back.
- `netlify deploy` returns 403, or `netlify login` times out → usually a Netlify incident. Check https://www.netlifystatus.com/, wait, retry. If the CLI was logged out, `netlify login`, complete the browser step, confirm with `netlify status`, deploy again.
- A function change did not take effect → redeploy with `--skip-functions-cache`.
- Need to undo a deploy fast → Netlify dashboard → Deploys → pick the previous deploy → Publish deploy. No build, takes seconds. Then `git revert` the commit so the repo matches.

## Rules

- Never commit secrets, tokens or API keys. `.env` is gitignored; keep it that way.
- Never add an Adobe remote or author a commit with the Adobe email.
- If the owner says "don't push to production until I say", keep committing locally and hold the deploy.
