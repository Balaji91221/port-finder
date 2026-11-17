# Contributing to Port Finder

Thanks for helping! This guide gets you from clone to pull request.

## Ways to help

- **Report a bug** — use the [bug report form](https://github.com/Balaji91221/port-finder/issues/new?template=bug_report.yml).
- **Suggest a feature** — use the [feature request form](https://github.com/Balaji91221/port-finder/issues/new?template=feature_request.yml).
- **Teach it a new app** — add a rule so a framework shows its real name instead of `node` or `Python`
  (see [Adding an app name](#adding-an-app-name)).
- **Improve docs** — typos, unclear steps, screenshots.

Look for issues labelled `good first issue` if you are new.

## Set up

Requires Node.js 20+, npm and Python 3.

```sh
git clone https://github.com/<you>/port-finder.git
cd port-finder
npm install
npm run dev                                                     # page on :3000
python3 apps/web/public/port-helper.py --origin http://localhost:3000   # helper
```

Open `http://localhost:3000/?demo` to work on the UI without the helper.

## Before you open a pull request

All of these must pass — CI runs the same checks:

```sh
npm run lint
npm run typecheck
npm test
npm run test:helper
npm run build
```

- Keep pull requests small and focused: one fix or feature each.
- Add or update tests in `apps/web/lib/*.test.ts` for logic changes.
- For UI changes, add a before/after screenshot to the PR.
- Update `README.md` and `CHANGELOG.md` when behaviour changes.

## Code style

- TypeScript `strict` is on. No `any`, no non-null `!`, no `as` casts on data from the helper —
  validate it in `lib/parse.ts`.
- Model states as discriminated unions (see `Source` in `lib/types.ts`).
- The helper stays a **single Python file with no dependencies** (standard library only).
- Anything that can stop a process must keep the safety checks in `stop_process()`:
  the PID must be listening on that port, owned by the user, and not a system app.

## Adding an app name

App names come from rules at the top of `apps/web/public/port-helper.py`:

- `APP_RULES` — match on the process name (e.g. `postgres` → PostgreSQL).
- `COMMAND_RULES` — match on the full command line (e.g. `next dev` → Next.js).

Add your rule, run the helper, and check the label in the page.

## Commit messages

Write a short summary line in the imperative mood ("Add Linux support", not "Added…"),
then a blank line and the why, if it is not obvious.

## Code of Conduct

By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
