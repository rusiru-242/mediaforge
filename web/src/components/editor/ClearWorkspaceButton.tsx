import { Trash2 } from 'lucide-react';

export function ClearWorkspaceButton({ disabled, onClear }: { disabled: boolean; onClear: () => void }) {
  return <button type="button" disabled={disabled} onClick={onClear}
    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-outline-variant/40 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">
    <Trash2 className="h-4 w-4" aria-hidden="true" />Clear workspace
  </button>;
}
