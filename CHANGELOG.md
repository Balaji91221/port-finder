# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **Logs** button on every port: a live panel with the last 200 lines the process printed,
  updated every 2 s. Works in the project view, the table and the demo.
- Helper 1.3: `GET /logs?pid=&port=` endpoint and `canLogs` in `/ports`.
- **Stop all** button: stops every listed port except system apps, after one confirm.
  Respects the search filter.
- `?demo` link opens the demo directly.
- Open-source docs: README, CONTRIBUTING, SECURITY, Code of Conduct, issue and PR templates.
- GitHub Actions CI: lint, typecheck, tests, helper check and build.

## [0.2.0] - 2026-11-17

### Added

- Rebuilt as a Next.js 16 + TypeScript app in an npm workspace (`apps/web`).
- **Quick scan**: browser-only check of ~56 common dev ports, no install.
- **Demo** mode with sample data.
- **Stop** button per port, with confirm step and Force stop.
- Helper 1.2: `POST /kill` endpoint, `--read-only` flag, `canKill` in `/ports`.
- Unit tests with Vitest.

### Changed

- The helper moved to `apps/web/public/port-helper.py`.

### Security

- Next.js 16.4.6 (GHSA-mfr8-8qww-v76h).

## [0.1.0] - 2026-11-17

### Added

- First release: static page and Python helper listing ports by project.

[Unreleased]: https://github.com/Balaji91221/port-finder/compare/b8d8b63...HEAD
[0.2.0]: https://github.com/Balaji91221/port-finder/compare/8cb6ca0...b8d8b63
[0.1.0]: https://github.com/Balaji91221/port-finder/commit/8cb6ca0
