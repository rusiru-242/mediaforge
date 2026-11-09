# MediaForge Component Library & UI Guide

## 1. Design Principles
MediaForge adheres to an accessible, responsive, dark-first design architecture designed for media processing workflows:
- **Consistent Hierarchy:** Standardized paddings, border radii (`rounded-xl`, `rounded-2xl`), and elevations.
- **Accessible Contrasts:** WCAG AA compliant text color ratios across both light and dark themes.
- **Visual Feedback:** Explicit pending, loading, progress, and error alert banners for asynchronous operations.

---

## 2. UI Components (`web/src/components/ui/`)

### `Button`
Standardized button primitive supporting multiple visual variants, sizing options, icons, and automated loading spinners.
- **Props:**
  - `variant`: `'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'`
  - `size`: `'sm' | 'md' | 'lg'`
  - `isLoading`: boolean (renders an animated `Loader2` spinner and disables pointer events)
  - `leftIcon`: `React.ReactNode` (leading icon)
  - `rightIcon`: `React.ReactNode` (trailing icon)

### `Card`
Surface container supporting hover elevations and border highlights.
- **Props:**
  - `hover`: boolean (adds `-translate-y-1` and shadow lift on hover)
  - `className`: optional Tailwind classes

### `Badge`
Compact pill status and tag indicators.
- **Props:**
  - `variant`: `'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary'`

### `Input`
Accessible form input supporting label, helper text, validation error messaging, and left/right icon slots.
- **Props:** Standard HTML input attributes plus `label`, `error`, `helperText`, `leftIcon`, `rightIcon`.

### `Select`
Custom-styled drop-down selector with standard chevron styling and disabled state options.
- **Props:** `options: { label: string; value: string | number; disabled?: boolean }[]`, `label`, `error`, `helperText`.

### `ProgressBar`
Animated progress bar indicating percentage completion with colored themes (`violet`, `emerald`, `blue`, `rose`, `amber`).
- **Features:** Automated numerical clamping (`0%` to `100%`), ARIA accessibility attributes (`aria-valuenow`, `aria-valuemin`, `aria-valuemax`), and optional pulse animation.

### `ThemeToggle`
Client component toggling between light and dark themes with system preference synchronization.

---

## 3. Feedback Components (`web/src/components/feedback/`)

### `JobStatusBadge`
Specialized badge displaying one of the 6 backend job statuses with icon and color-coding:
- `PENDING`: Gray badge with clock icon
- `QUEUED`: Blue badge with queue icon
- `PROCESSING`: Violet badge with spinner
- `COMPLETED`: Emerald badge with check icon
- `FAILED`: Rose badge with error icon
- `CANCELLED`: Slate badge with cancel icon

### `FileDropzone`
Drag-and-drop file upload zone with:
- Drag-over highlight animations
- File size boundary validation (e.g. 500MB max limit)
- MIME-type / file extension filtering
- File preview details and one-click removal action

### `ErrorAlert`
Dismissible warning banner displaying RFC 7807 problem details or network failure messages.

---

## 4. Layout Components (`web/src/components/layout/`)

### `Navbar`
- Responsive header with brand logo, main navigation routes, and mobile slide-down menu.
- **Live Health Status Pill:** Continuously pinging backend `/health` endpoint to show real-time connection status (`Backend Online` vs `Backend Offline`).
- Includes theme toggle switch.

### `Footer`
- Links to converter routes, legal documents (Privacy, Terms), about page, GitHub repository, and direct Swagger UI REST documentation.
- Monorepo phase badge (`Phase 03 — Next.js & Spring Boot Integration`).

