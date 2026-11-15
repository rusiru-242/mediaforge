'use client';

import { useEffect, useRef } from 'react';

/** Protect active work from links, browser history, reloads and tab closure. */
export function useNavigationGuard(busy: boolean, message = 'A download or processing task is still running. Leave this page?') {
  const messageRef = useRef(message);
  messageRef.current = message;
  useEffect(() => {
    if (!busy) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const click = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest?.('a[href]');
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute('download') || anchor.target === '_blank') return;
      const target = new URL(anchor.href);
      if (target.pathname === location.pathname && target.search === location.search) return;
      if (!window.confirm(messageRef.current)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    // A sentinel history entry lets Back ask before unmounting the current page.
    const originalUrl = location.href;
    history.pushState(history.state, '', originalUrl);
    let leaving = false;
    const popstate = (event: PopStateEvent) => {
      if (leaving) return;
      event.stopImmediatePropagation();
      if (window.confirm(messageRef.current)) {
        leaving = true;
        history.back();
      } else {
        history.pushState(history.state, '', originalUrl);
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', click, true);
    window.addEventListener('popstate', popstate, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', click, true);
      window.removeEventListener('popstate', popstate, true);
    };
  }, [busy]);
}
