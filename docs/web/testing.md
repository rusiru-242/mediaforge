# MediaForge Web Testing Guide

## 1. Overview
The MediaForge Web testing suite is built using **Vitest** and **React Testing Library** with a JSDOM browser simulation environment. It provides rapid execution times (<5 seconds) and validates component state transitions, accessible attributes, and API mock contracts.

---

## 2. Test Architecture

### Configuration (`vitest.config.ts`)
- **Environment:** `jsdom`
- **Setup Files:** `src/test/setup.ts` (configures global mocks such as `window.matchMedia` for responsive and theme tests)
- **Path Resolution:** Aligns `@/*` alias to `./src/*`

### Test Suites (`web/src/test/`)

| Test File | Target | Coverage & Scenarios |
| :--- | :--- | :--- |
| `apiClient.test.ts` | `services/apiClient.ts` | Health checks, formats fetching, SSRF URL validation, download job submission, conversion job submission, RFC 7807 problem details parsing, error handling |
| `Button.test.tsx` | `components/ui/Button.tsx` | Child rendering, click handlers, loading state with spinner & pointer disablement, variant style applications |
| `JobStatusBadge.test.tsx` | `components/feedback/JobStatusBadge.tsx` | Validates visual rendering and label output for all 6 job lifecycle states (`PENDING`, `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`, `CANCELLED`) |
| `ProgressBar.test.tsx` | `components/ui/ProgressBar.tsx` | Numeric clamping (under 0% and above 100%), ARIA accessibility attributes (`aria-valuenow`, `aria-valuemin`, `aria-valuemax`), label and percentage text |

---

## 3. Running Tests Locally

From the `web/` directory:

```bash
# Run tests once in CI mode
npm run test

# Run tests in watch mode during development
npx vitest

# Run with test coverage
npx vitest run --coverage
```

---

## 4. CI Workflow Integration
The web test suite is executed on every push and pull request via the GitHub Actions workflow `.github/workflows/web-ci.yml`. The build step enforces zero test regressions and zero TypeScript/ESLint warnings before allowing merge to `develop`.

