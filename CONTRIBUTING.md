# Contributing to MediaForge

Thank you for considering contributing to MediaForge! This document outlines our development workflow, coding standards, and contribution guidelines.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Branch Naming Convention](#branch-naming-convention)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Reporting Issues](#reporting-issues)

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. Harassment, discrimination, or abusive behavior of any kind will not be tolerated.

---

## Getting Started

1. **Fork** the repository on GitHub.
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/mediaforge.git
   cd mediaforge
   ```
3. **Add the upstream remote:**
   ```bash
   git remote add upstream https://github.com/rusiru-242/mediaforge.git
   ```
4. **Copy and configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your local values
   ```
5. **Create a feature branch** from `develop`:
   ```bash
   git checkout develop
   git pull upstream develop
   git checkout -b feat/your-feature-name
   ```

---

## Development Workflow

We use **GitHub Flow** adapted for a phased monorepo:

```
main          ← stable, production-ready releases only
develop       ← integration branch for all completed features
chore/phase-XX ← phase-level branches for structured development
feat/...      ← individual feature branches (branch from develop)
fix/...       ← bug fix branches
docs/...      ← documentation-only branches
refactor/...  ← code refactoring branches
test/...      ← test-only branches
ci/...        ← CI/CD configuration branches
```

**Never commit directly to `main` or `develop`.**

---

## Branch Naming Convention

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feat/` | New feature | `feat/video-download-engine` |
| `fix/` | Bug fix | `fix/conversion-timeout` |
| `docs/` | Documentation | `docs/api-reference` |
| `refactor/` | Code refactoring | `refactor/job-queue-service` |
| `test/` | Tests only | `test/conversion-unit-tests` |
| `ci/` | CI/CD pipeline | `ci/docker-build-action` |
| `chore/` | Build, tooling, phase branches | `chore/phase-01-foundation` |
| `hotfix/` | Critical production fix | `hotfix/security-patch-jwt` |

---

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <short description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `style` | Formatting, missing semicolons (no logic change) |
| `refactor` | Code refactoring (no feature or fix) |
| `test` | Adding or updating tests |
| `chore` | Build process, tooling, maintenance |
| `ci` | CI/CD pipeline changes |
| `perf` | Performance improvement |
| `revert` | Revert a previous commit |

### Scopes

| Scope | Area |
|-------|------|
| `backend` | Spring Boot API |
| `web` | Next.js frontend |
| `flutter` | Flutter app |
| `worker` | Media processing workers |
| `db` | Database migrations/schema |
| `ci` | GitHub Actions |
| `docs` | Documentation |
| `infra` | Docker, infrastructure |

### Examples

```
feat(backend): add video download endpoint with quality selection
fix(worker): handle FFmpeg timeout on large file conversion
docs(phase-01): complete project foundation and architecture
chore(infra): add Docker Compose for local development
test(backend): add unit tests for MediaService
ci: add GitHub Actions workflow for backend tests
refactor(worker): extract FFmpeg command builder to utility class
```

### Rules

- Use **present tense** ("add feature" not "added feature")
- Use **imperative mood** ("move cursor" not "moves cursor")
- Keep the subject line to **72 characters or less**
- Reference issues with `Closes #123` or `Fixes #456` in the footer
- Breaking changes must include `BREAKING CHANGE:` in the footer

---

## Pull Request Process

1. **Ensure all tests pass** before opening a PR.
2. **Keep PRs focused** — one feature or fix per PR.
3. **Fill out the PR template** completely.
4. **Link related issues** using keywords (`Closes #123`).
5. **Request a review** from at least one maintainer.
6. **Respond to feedback** promptly and constructively.
7. **Do not merge your own PR** — wait for maintainer approval.
8. PRs to `main` require at least **2 approvals**.
9. PRs to `develop` require at least **1 approval**.

---

## Coding Standards

### Java / Spring Boot
- Follow [Google Java Style Guide](https://google.github.io/styleguide/javaguide.html)
- 4-space indentation
- Maximum line length: 120 characters
- All public methods must have Javadoc
- Use `final` where applicable
- Prefer constructor injection over field injection

### TypeScript / Next.js
- Follow [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- 2-space indentation
- Use `const` and `let`, never `var`
- All functions must have explicit return types
- Use interfaces over types where possible
- Avoid `any` — use `unknown` with type guards

### Dart / Flutter
- Follow the [official Dart style guide](https://dart.dev/guides/language/effective-dart/style)
- 2-space indentation
- Use `const` constructors where possible
- Separate UI from business logic (use providers/blocs)

---

## Testing Requirements

| Component | Minimum Coverage | Test Types |
|-----------|-----------------|------------|
| Backend | 80% line coverage | Unit, Integration |
| Web | 70% line coverage | Unit, Component |
| Flutter | 70% line coverage | Unit, Widget |
| Workers | 75% line coverage | Unit, Integration |

All PRs must pass existing tests and must include tests for new functionality.

---

## Reporting Issues

When reporting a bug, please include:

1. **Environment** (OS, browser, app version)
2. **Steps to reproduce** (numbered, specific)
3. **Expected behavior**
4. **Actual behavior**
5. **Screenshots or logs** (if applicable)

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug-report.md) when creating issues.

For feature requests, use the [Feature Request template](.github/ISSUE_TEMPLATE/feature-request.md).

---

## Questions?

Open a [Discussion](https://github.com/rusiru-242/mediaforge/discussions) for questions, ideas, or general feedback.

Thank you for contributing to MediaForge! 🚀
