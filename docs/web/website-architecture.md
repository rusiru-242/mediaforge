# MediaForge Website Architecture (Phase 03)

## 1. Overview
The MediaForge Web Portal is a responsive, modern frontend built inside the MediaForge monorepo using **Next.js 15 (App Router)**, **React 19**, **TypeScript**, and **Tailwind CSS**. It serves as the primary browser-based interface for media downloads, audio/video/image transcoding, batch processing, and async job telemetry.

## 2. Directory Structure

```
web/
├── .env.example                # Example environment variables
├── .env.local                  # Local development environment configuration
├── .eslintrc.json              # Next.js Core Web Vitals ESLint rules
├── next.config.ts              # Next.js build and image optimization settings
├── package.json                # Project dependencies and lifecycle scripts
├── postcss.config.mjs          # PostCSS configuration for Tailwind
├── tailwind.config.ts          # MediaForge dark violet / slate design system
├── tsconfig.json               # TypeScript path aliases (@/* -> ./src/*)
├── vitest.config.ts            # Vitest unit & component test configuration
└── src/
    ├── app/                    # Next.js App Router routes & layouts
    │   ├── layout.tsx          # Root layout with theme script, Navbar, & Footer
    │   ├── page.tsx            # Homepage with hero, tools, features, & CTA
    │   ├── loading.tsx         # Global loading skeleton
    │   ├── error.tsx           # Global error boundary with retry handler
    │   ├── not-found.tsx       # 404 handler with navigation links
    │   ├── downloader/         # Media download ingestion interface
    │   ├── converter/
    │   │   ├── video/          # Video transcoding with codec/bitrate settings
    │   │   ├── audio/          # Audio transcoding with sample rate controls
    │   │   ├── image/          # Image conversion with compression tuning
    │   │   └── batch/          # Batch queue orchestration simulator
    │   ├── history/            # Paginated job history with status filters
    │   ├── jobs/[id]/          # Real-time job inspection and download link
    │   ├── formats/            # Codec & container directory
    │   ├── about/              # Mission & monorepo architecture overview
    │   ├── privacy/            # Ephemeral 24h retention and zero-tracking policy
    │   └── terms/              # Terms of service and acceptable use guidelines
    ├── components/
    │   ├── feedback/           # JobStatusBadge, ErrorAlert, FileDropzone
    │   ├── layout/             # Navbar, Footer
    │   └── ui/                 # Button, Card, Badge, Input, Select, ProgressBar, ThemeToggle
    ├── hooks/
    │   └── useTheme.ts         # Persistent light/dark mode hook
    ├── services/
    │   └── apiClient.ts        # Typed fetch client with RFC 7807 problem details handling
    ├── styles/
    │   └── globals.css         # CSS variables, dark mode styles, custom scrollbar
    ├── test/                   # Setup and unit/component test specifications
    │   ├── apiClient.test.ts
    │   ├── Button.test.tsx
    │   ├── JobStatusBadge.test.tsx
    │   ├── ProgressBar.test.tsx
    │   └── setup.ts
    ├── types/
    │   └── api.ts              # TypeScript models aligned with Spring Boot DTOs
    └── utils/
        └── cn.ts               # Classname merging utility (clsx + tailwind-merge)
```

## 3. Technology Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | 15.1.7 | Server/Client rendering, routing, layouts |
| **UI Library** | React | 19.0.0 | Component hierarchy, state, hooks |
| **Styling** | Tailwind CSS | 3.4.17 | Utility-first responsive design, dark mode |
| **Icons** | Lucide React | 0.475.0 | Consistent iconography |
| **Language** | TypeScript | 5.7.3 | Static typing, contract alignment with backend |
| **Testing** | Vitest + Testing Library | 3.0.5 | High-speed unit and component test execution |
| **HTTP Client** | Native fetch API | Modern ES | Type-safe REST communication with Spring Boot |

## 4. Design System & Theme Architecture
- **Color Palette:**
  - Dark Mode: Rich deep navy (`#0B0F19`, `#111827`) with violet accents (`#8B5CF6`).
  - Light Mode: Clean slate (`#F8FAFC`, `#FFFFFF`) with vibrant indigo/violet borders and buttons.
- **Theme Persistence:** Stored in browser `localStorage('theme')` and applied synchronously via an inline `<head>` script to avoid FOUC (Flash of Unstyled Content).
- **Responsive Layout:** Mobile drawer navigation, collapsible action bars, and flexible CSS grid layouts for mobile, tablet, and desktop viewports.
