# ArkenBackUpEnd

A consolidated backup of three ARKEN service repositories, kept together in one place.

## Contents

| Directory | Source repository | Branch imported |
|---|---|---|
| `frontend/` | `Arken-AI/frontend` | `master` |
| `backend/` | `Arken-AI/backend` | `master` |
| `hx_design_engine/` | `Arken-AI/hx_design_engine` | `master` |

## How this repository was built

- Each directory was imported with `git subtree add --prefix=<dir>` **without `--squash`**, so the original commits, authors and dates are preserved in this repository's history. No historical commits were created or altered.
- Only files tracked by each source repository were imported. `.env` files, virtual environments, `node_modules/`, caches and other generated files were not copied.
- The source repositories themselves were not modified.
- Use `git log --graph` (or `git log <commit>`) to browse the imported history. A path-filtered `git log -- <dir>` shows only the import merge commit, because the original commits predate the directory prefix.

## Notes

- `.github/contribution-log.md` is a pre-existing file on `main` and is left as-is.
- Copy `.env.example` in each directory to `.env` and fill in your own values before running any service. Never commit real credentials.
