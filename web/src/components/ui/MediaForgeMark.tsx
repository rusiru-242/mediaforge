export function MediaForgeMark({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="3" width="20" height="18" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M6 3v18M18 3v18M2 8h4M2 16h4M18 8h4M18 16h4" stroke="currentColor" strokeWidth="1.5" />
      <path d="m10 8 6 4-6 4V8Z" fill="currentColor" />
    </svg>
  );
}
