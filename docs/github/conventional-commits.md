# MediaForge — Conventional Commit Guidelines

**Reference:** [conventionalcommits.org](https://www.conventionalcommits.org/en/v1.0.0/)

---

## Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

## Types

| Type | When to Use |
|------|------------|
| `feat` | New feature for the user |
| `fix` | Bug fix for the user |
| `docs` | Documentation only changes |
| `style` | Formatting, whitespace (no logic change) |
| `refactor` | Code refactoring |
| `test` | Adding or updating tests |
| `chore` | Build process, tooling, maintenance |
| `ci` | CI/CD pipeline changes |
| `perf` | Performance improvement |
| `revert` | Revert a previous commit |

## Scopes

`backend` · `web` · `flutter` · `worker` · `db` · `ci` · `docs` · `infra`

## Examples

```bash
feat(backend): add video download endpoint with quality selection
fix(worker): handle FFmpeg timeout on large file conversion
docs(phase-01): complete project foundation and architecture
chore(infra): add Docker Compose for local development stack
test(backend): add unit tests for MediaService with 85% coverage
ci: add GitHub Actions workflow for backend CI pipeline
refactor(worker): extract FFmpeg command builder to utility class
perf(backend): add database index on jobs.status column
feat(flutter)!: redesign offline conversion screen (BREAKING CHANGE)
```

## Breaking Changes

Include `BREAKING CHANGE:` in the footer:

```
feat(api)!: change job response schema to include nested options

BREAKING CHANGE: The `options` field is now a nested object instead of a flat map.
Clients must update their response parsing logic.
```

## Rules

- Use **present tense**: "add feature" ✅ not "added feature" ❌
- Use **imperative mood**: "move cursor" ✅ not "moves cursor" ❌
- Subject line ≤72 characters
- Reference issues in footer: `Closes #123`, `Fixes #456`
- Never capitalize the first letter of the description
- No period at the end of the subject line
