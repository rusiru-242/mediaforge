# MediaForge frontend production deployment (Vercel)

This guide prepares the Next.js frontend for Vercel. **It does not deploy the
application, provision a backend, or purchase services.** Production connectivity
has not been verified against a hosted backend.

## Frontend architecture and deployment behavior

- `web/` is the standalone Next.js App Router application.
- `package.json` declares Next.js `^15.1.7` and React `^19.0.0`; this checkout's
  lockfile resolves Next.js `15.5.29`.
- `web/package-lock.json` identifies npm as the package manager. Use Node.js 22.x
  and `npm ci` for a reproducible install.
- Browser API calls are centralized in `web/src/services/apiClient.ts` and use
  `NEXT_PUBLIC_API_BASE_URL`, configured in `web/src/config/api.ts`. Job and file
  download links use the same base URL.
- API calls are made by the browser directly to Spring Boot; there are no frontend
  API proxy rewrites or server-side API routes. The backend must be publicly
  reachable over HTTPS for a production deployment.
- The production CSP permits requests and media from the configured API origin.
  Development builds additionally permit the supported localhost API ports and
  development-only script evaluation. No API credentials belong in this frontend.
- `output: "standalone"` is retained for the existing Dockerfile, which runs
  Next's generated standalone server. Vercel should use its Next.js framework
  integration and default `.next` output handling; do not set a custom output
  directory. No rewrites or redirects are required.
- Existing security headers are emitted from `web/next.config.ts`. Vercel's Next.js
  integration applies them to the Next routes.

## GitHub-to-Vercel setup

1. Push the frontend and deployment documentation to the GitHub repository. Do not
   add `.env.local` or production credentials to Git.
2. In Vercel, choose **Add New → Project**, import the MediaForge GitHub repository,
   and authorize repository access as appropriate.
3. In project configuration, set **Root Directory** to `web` (the repository's
   `web/` folder). Leave the option to include files outside the root directory
   disabled; this frontend does not depend on sibling workspace packages.
4. Select the **Next.js** framework preset. Set **Node.js Version** to `22.x`.
5. Use these build settings:

   | Setting | Value |
   |---|---|
   | Install Command | `npm ci` |
   | Build Command | `npm run build` |
   | Output Directory | Leave the Next.js default (`.next`); do not override |
   | Development Command | `npm run dev` |

   Vercel detects the framework and scripts from `web/package.json`. Do not add a
   `vercel.json` solely to restate these settings.
6. Add the environment variable below for the **Production** environment. Add it
   separately for Preview or Development only when those deployments should call
   an available backend and their origins have been approved in backend CORS.
7. Save the settings and deploy from Vercel only when deployment is authorized.
   Changing a `NEXT_PUBLIC_*` value requires a new build/deployment because Next.js
   inlines it into browser assets.

## Environment variables

| Variable | Required | Value |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Yes for production | The real, browser-reachable HTTPS Spring Boot API base URL, including `/api/v1` (for example, `https://<your-api-host>/api/v1`). Do not use a guessed domain, localhost, an internal Docker hostname, or a secret. |

Local development can omit the variable and uses
`http://localhost:8081/api/v1`. `web/.env.example` documents this safe local value;
copy it to `web/.env.local` for local overrides. `.env.local` and `.env.*` secrets
are ignored by Git. Never set an API key, bearer token, password, private key, or
other credential in a `NEXT_PUBLIC_*` variable: all such values are exposed to
the browser.

No separate `NEXT_PUBLIC_APP_NAME` or `NEXT_PUBLIC_APP_ENV` variable is required;
the frontend does not use them. Keep backend-only settings (including
`CORS_ALLOWED_ORIGINS`) in the backend hosting environment, not Vercel frontend
variables.

## Backend API integration and CORS

Before deploying the frontend, deploy the Spring Boot API independently, configure
its public HTTPS endpoint, and verify its health and API routes. Then set
`NEXT_PUBLIC_API_BASE_URL` to that real endpoint and rebuild the frontend. A
successful frontend build alone does not establish backend availability.

The browser sends API calls directly to that host, so the backend must allow the
frontend's exact origin. In the backend production environment set
`CORS_ALLOWED_ORIGINS` to a comma-separated list of exact HTTPS origins, with no
paths, trailing slash, or wildcards. For example, after choosing the actual
Vercel domains:

```text
CORS_ALLOWED_ORIGINS=https://<your-production-domain>,https://<your-approved-preview-domain>
```

Only add origins that should access the API. Vercel preview URLs can vary; prefer
a stable, explicitly approved preview domain, or add exact origins as needed.
Do not allow every preview host by wildcard. The current backend validates exact
HTTPS origins in its production profile, permits the methods and request headers
used by the frontend, and exposes download-related response headers. CORS is not
authentication. Backend changes or configuration must be made and verified on
the backend deployment; the frontend cannot repair a server-side CORS rejection.

Uploads, polling, conversions, and downloads go from the browser to the API host.
Configure backend request-size, processing, storage, and rate limits for the
expected use. Vercel is not a media-processing proxy in this design.

The online downloader must continue to accept only YouTube, Facebook, and
Instagram URLs. Do not expose TikTok, Twitter/X, or generic direct-URL downloading.
Test only media the operator is authorized to access.

## HTTPS and CORS verification

After both services are actually hosted:

1. Open the production site over HTTPS and inspect the browser Network panel.
2. Confirm API requests go to the configured HTTPS host and the expected `/api/v1`
   routes; there should be no request to localhost or an internal Docker hostname.
3. Confirm API responses (including `OPTIONS` preflights for JSON POSTs and file
   uploads) include the expected `Access-Control-Allow-Origin` for the exact
   production website origin. Do not use `Access-Control-Allow-Origin: *` as a
   workaround.
4. Confirm the API certificate is valid and there are no mixed-content or CSP
   errors. The production CSP permits the configured API origin, not arbitrary
   HTTP API hosts.
5. Confirm health, upload, conversion, job polling, media/file downloads, and
   batch ZIP requests against the real hosted backend. This guide and a successful
   local build do not claim those production checks have passed.

## Troubleshooting

- **Production build says `NEXT_PUBLIC_API_BASE_URL` is missing:** add it to the
  Vercel Production environment and redeploy. Production builds intentionally do
  not fall back to localhost.
- **Production build rejects the URL:** it must be an absolute HTTPS URL with no
  username/password, query, or fragment. Include the backend API prefix, normally
  `/api/v1`.
- **Browser requests localhost:** the frontend bundle was built with the wrong
  variable or a stale deployment. Set the Production value and trigger a fresh
  deployment; browser environment changes do not update an existing bundle.
- **CORS/preflight error:** add the exact HTTPS website origin to the backend's
  `CORS_ALLOWED_ORIGINS`, redeploy/restart the backend as required, then retry.
  Do not set CORS on the frontend or open it to arbitrary origins.
- **502/network error or failed health:** verify the API host, TLS certificate,
  backend health, routing, and hosting firewall. Vercel cannot resolve local
  machine or Docker-only hostnames.
- **CSP or mixed-content error:** ensure the configured HTTPS API host matches the
  API actually used by the browser and that generated media/download links also
  use HTTPS.
- **Upload/download or long processing fails:** inspect backend size/time/storage
  limits and browser Network responses. These requests are direct to Spring Boot;
  increasing a Vercel function timeout does not change backend limits.
- **`npm ci` fails:** confirm the Vercel root is `web` and that the committed
  `package-lock.json` matches `package.json`.

## Post-deployment testing checklist

- [ ] Production site loads over HTTPS and static assets have no console errors.
- [ ] The public API health check and the frontend health indicator succeed.
- [ ] Video, audio, and image conversion interfaces load formats and complete
  authorized end-to-end jobs.
- [ ] Batch conversion and batch ZIP download work.
- [ ] File upload, job progress/status, and completed-file download work.
- [ ] Downloader accepts supported YouTube, Facebook, and Instagram flows only;
  TikTok, Twitter/X, and generic direct URLs remain unsupported.
- [ ] Browser Network panel shows only the intended HTTPS API origin, and CORS
  succeeds for production (and only approved preview) origins.
- [ ] Production response headers include the configured CSP and security headers.
- [ ] Backend limits, retention, rate limiting, and operational monitoring are
  appropriate for the deployed workload.
