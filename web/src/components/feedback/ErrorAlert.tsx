import { AlertTriangle, X } from "lucide-react";

export interface ErrorAlertProps {
  title?: string;
  message: string;
  code?: string;
  onDismiss?: () => void;
  onClose?: () => void;
}

export function ErrorAlert({ title = "An error occurred", message, code, onDismiss, onClose }: ErrorAlertProps) {
  const handleDismiss = onClose || onDismiss;

  return (
    <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-4 text-rose-900 dark:text-rose-200">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-semibold">{title}</h4>
              {code && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/80 text-rose-700 dark:text-rose-300">
                  {code}
                </span>
              )}
            </div>
            <p className="text-xs mt-1 text-rose-800 dark:text-rose-300 leading-relaxed">{message}</p>
          </div>
        </div>
        {handleDismiss && (
          <button
            onClick={handleDismiss}
            className="text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-200 p-1"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
