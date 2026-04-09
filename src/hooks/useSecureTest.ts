import { useState, useEffect, useCallback, useRef } from 'react';

export type SecureWarning =
  | { type: 'tab-switch'; count: number; max: number }
  | { type: 'fullscreen-exit' }
  | { type: 'locked'; reason: string };

interface UseSecureTestOptions {
  enabled: boolean;
  maxTabSwitches?: number;
  onViolationLimit: () => void;
  onTabSwitch?: (count: number) => void;
}

interface UseSecureTestReturn {
  isFullscreen: boolean;
  tabSwitchCount: number;
  warning: SecureWarning | null;
  isLocked: boolean;
  dismissWarning: () => void;
  requestFullscreen: () => void;
}

export function useSecureTest({
  enabled,
  maxTabSwitches = 3,
  onViolationLimit,
  onTabSwitch,
}: UseSecureTestOptions): UseSecureTestReturn {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [warning, setWarning] = useState<SecureWarning | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  // Stable refs — event handlers read these, never stale
  const switchCountRef = useRef(0);
  const isLockedRef = useRef(false);
  const hasEnteredFullscreenRef = useRef(false); // don't warn before first entry
  const onViolationLimitRef = useRef(onViolationLimit);
  const onTabSwitchRef = useRef(onTabSwitch);

  useEffect(() => { onViolationLimitRef.current = onViolationLimit; }, [onViolationLimit]);
  useEffect(() => { onTabSwitchRef.current = onTabSwitch; }, [onTabSwitch]);

  const requestFullscreen = useCallback(() => {
    document.documentElement.requestFullscreen().catch(() => {});
  }, []);

  const dismissWarning = useCallback(() => setWarning(null), []);

  // ── Fullscreen change ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    const handle = () => {
      const inFs = !!document.fullscreenElement;
      setIsFullscreen(inFs);

      if (inFs) {
        hasEnteredFullscreenRef.current = true;
      } else if (hasEnteredFullscreenRef.current && !isLockedRef.current) {
        // Only warn if we were previously in fullscreen (not on initial load)
        setWarning({ type: 'fullscreen-exit' });
      }
    };

    document.addEventListener('fullscreenchange', handle);
    return () => document.removeEventListener('fullscreenchange', handle);
  }, [enabled]);

  // ── ESC key interception ───────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Can't truly block ESC from exiting fullscreen in all browsers,
        // but we catch it and show the modal immediately
        if (hasEnteredFullscreenRef.current && !isLockedRef.current) {
          setWarning({ type: 'fullscreen-exit' });
        }
      }
      // Block copy/paste/select-all outside Monaco
      const target = e.target as HTMLElement;
      if (!target.closest('.monaco-editor')) {
        if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'a', 'u'].includes(e.key.toLowerCase())) {
          e.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handle, true);
    return () => document.removeEventListener('keydown', handle, true);
  }, [enabled]);

  // ── Tab / visibility switch ────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    const handle = () => {
      if (document.visibilityState !== 'hidden') return;
      if (isLockedRef.current) return;

      const newCount = switchCountRef.current + 1;
      switchCountRef.current = newCount;
      setTabSwitchCount(newCount);
      onTabSwitchRef.current?.(newCount);

      if (newCount >= maxTabSwitches) {
        isLockedRef.current = true;
        setIsLocked(true);
        setWarning({ type: 'locked', reason: `Tab switched ${newCount} times. Test auto-submitted.` });
        onViolationLimitRef.current();
      } else {
        setWarning({ type: 'tab-switch', count: newCount, max: maxTabSwitches });
      }
    };

    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  }, [enabled, maxTabSwitches]); // stable — callbacks via refs

  // ── Disable right-click outside editor ────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const block = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.monaco-editor')) e.preventDefault();
    };
    document.addEventListener('contextmenu', block);
    return () => document.removeEventListener('contextmenu', block);
  }, [enabled]);

  // ── Disable text selection outside editor ─────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const style = document.createElement('style');
    style.id = 'secure-test-style';
    style.textContent = `
      body.secure-test *:not(.monaco-editor *) { user-select: none !important; }
      body.secure-test .monaco-editor * { user-select: text !important; }
    `;
    document.head.appendChild(style);
    document.body.classList.add('secure-test');
    return () => {
      style.remove();
      document.body.classList.remove('secure-test');
    };
  }, [enabled]);

  return { isFullscreen, tabSwitchCount, warning, isLocked, dismissWarning, requestFullscreen };
}
