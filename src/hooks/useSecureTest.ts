import { useState, useEffect, useCallback, useRef } from 'react';

export type SecureWarning =
  | { type: 'tab-switch'; count: number; max: number }
  | { type: 'fullscreen-exit' }
  | { type: 'locked'; reason: string };

interface UseSecureTestOptions {
  enabled: boolean;          // only active during assessment (userAssessmentId present)
  maxTabSwitches?: number;
  onViolationLimit: () => void;  // called when tab switches exceed max
  onTabSwitch?: (count: number) => void; // called on each switch (for backend sync)
}

interface UseSecureTestReturn {
  isFullscreen: boolean;
  tabSwitchCount: number;
  warning: SecureWarning | null;
  isLocked: boolean;
  dismissWarning: () => void;
  requestFullscreen: () => void;
  initSecureMode: () => Promise<void>;
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

  // Use ref so event handlers always see latest count
  const switchCountRef = useRef(0);
  const isLockedRef = useRef(false);

  const requestFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
  }, []);

  const initSecureMode = useCallback(async () => {
    if (!enabled) return;
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Browser may block — show warning
      setWarning({ type: 'fullscreen-exit' });
    }
  }, [enabled]);

  const dismissWarning = useCallback(() => {
    setWarning(null);
  }, []);

  // ── Fullscreen change ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    const handleFsChange = () => {
      const inFs = !!document.fullscreenElement;
      setIsFullscreen(inFs);
      if (!inFs && !isLockedRef.current) {
        setWarning({ type: 'fullscreen-exit' });
      }
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, [enabled]);

  // ── ESC key interception ───────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent ESC from exiting fullscreen — show modal instead
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
        setWarning({ type: 'fullscreen-exit' });
      }
      // Block common cheat shortcuts outside editor
      const target = e.target as HTMLElement;
      const inEditor = target.closest('.monaco-editor');
      if (!inEditor) {
        if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'a', 'u'].includes(e.key.toLowerCase())) {
          e.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [enabled]);

  // ── Tab / visibility switch ────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    const handleVisibility = () => {
      if (document.visibilityState !== 'hidden') return;
      if (isLockedRef.current) return;

      const newCount = switchCountRef.current + 1;
      switchCountRef.current = newCount;
      setTabSwitchCount(newCount);
      onTabSwitch?.(newCount);

      if (newCount >= maxTabSwitches) {
        isLockedRef.current = true;
        setIsLocked(true);
        setWarning({ type: 'locked', reason: `Tab switched ${newCount} times. Test auto-submitted.` });
        onViolationLimit();
      } else {
        setWarning({ type: 'tab-switch', count: newCount, max: maxTabSwitches });
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [enabled, maxTabSwitches, onViolationLimit, onTabSwitch]);

  // ── Disable right-click ────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const block = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.monaco-editor')) e.preventDefault();
    };
    document.addEventListener('contextmenu', block);
    return () => document.removeEventListener('contextmenu', block);
  }, [enabled]);

  // ── Disable text selection outside editor ──────────────────────────────────
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
      document.head.removeChild(style);
      document.body.classList.remove('secure-test');
    };
  }, [enabled]);

  return {
    isFullscreen,
    tabSwitchCount,
    warning,
    isLocked,
    dismissWarning,
    requestFullscreen,
    initSecureMode,
  };
}
