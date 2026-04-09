import type { SecureWarning } from '../hooks/useSecureTest';

interface Props {
  warning: SecureWarning | null;
  isLocked: boolean;
  tabSwitchCount: number;
  maxTabSwitches: number;
  onReenterFullscreen: () => void;
  onDismiss: () => void;
}

export const SecureTestOverlay = ({
  warning,
  isLocked,
  tabSwitchCount,
  maxTabSwitches,
  onReenterFullscreen,
  onDismiss,
}: Props) => {
  if (!warning && !isLocked) return null;

  // ── Locked state — full block, no dismiss ──────────────────────────────────
  if (isLocked || warning?.type === 'locked') {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#080b10]/95 backdrop-blur-xl">
        <div className="text-center px-6 animate-result-pop">
          <div className="w-16 h-16 rounded-full bg-[var(--danger-dim)] border border-[rgba(255,71,87,0.4)] flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h2 className="font-display font-bold text-2xl text-danger mb-2">Test Locked</h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-xs mx-auto leading-relaxed">
            {warning?.type === 'locked' ? warning.reason : 'Maximum violations reached. Your test has been auto-submitted.'}
          </p>
          <div className="mt-6 flex justify-center gap-2">
            {Array.from({ length: maxTabSwitches }).map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-danger" />
            ))}
          </div>
          <p className="mt-4 text-xs text-[var(--text-muted)] font-mono">Contact your administrator if this was a mistake.</p>
        </div>
      </div>
    );
  }

  // ── Tab switch warning ─────────────────────────────────────────────────────
  if (warning?.type === 'tab-switch') {
    const remaining = maxTabSwitches - warning.count;
    const isLastWarning = remaining === 1;
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#080b10]/80 backdrop-blur-md animate-fade-in">
        <div className={`card w-full max-w-sm mx-4 overflow-hidden animate-result-pop border ${isLastWarning ? 'border-[rgba(255,71,87,0.5)]' : 'border-[rgba(245,158,11,0.4)]'}`}>
          {/* Header stripe */}
          <div className={`h-1 w-full ${isLastWarning ? 'bg-danger' : 'bg-warn'}`} />

          <div className="p-6">
            {/* Icon + title */}
            <div className="flex items-start gap-4 mb-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isLastWarning ? 'bg-[var(--danger-dim)]' : 'bg-[var(--warn-dim)]'}`}>
                <svg className={`w-5 h-5 ${isLastWarning ? 'text-danger' : 'text-warn'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div>
                <h3 className={`font-display font-bold text-base ${isLastWarning ? 'text-danger' : 'text-warn'}`}>
                  Tab Switch Detected
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                  Violation {warning.count} of {maxTabSwitches}
                </p>
              </div>
            </div>

            {/* Violation dots */}
            <div className="flex gap-2 mb-5">
              {Array.from({ length: maxTabSwitches }).map((_, i) => (
                <div key={i} className={`flex-1 h-1.5 rounded-full transition-colors ${
                  i < warning.count
                    ? isLastWarning ? 'bg-danger' : 'bg-warn'
                    : 'bg-[var(--bg-overlay)]'
                }`} />
              ))}
            </div>

            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-5">
              {isLastWarning
                ? '🚨 This is your final warning. One more tab switch will auto-submit your test.'
                : `You have ${remaining} warning${remaining > 1 ? 's' : ''} remaining before your test is auto-submitted.`
              }
            </p>

            <button
              onClick={onDismiss}
              className={`btn w-full justify-center py-2.5 ${isLastWarning ? 'btn-danger' : 'btn-primary'}`}
            >
              I understand — Return to test
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Fullscreen exit warning ────────────────────────────────────────────────
  if (warning?.type === 'fullscreen-exit') {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#080b10]/90 backdrop-blur-xl animate-fade-in">
        {/* Blurred content hint */}
        <div className="card w-full max-w-sm mx-4 overflow-hidden animate-result-pop border border-[rgba(255,71,87,0.4)]">
          <div className="h-1 w-full bg-danger" />
          <div className="p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-[var(--danger-dim)] border border-[rgba(255,71,87,0.3)] flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
              </svg>
            </div>
            <h3 className="font-display font-bold text-lg text-danger mb-2">
              Fullscreen Required
            </h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-5">
              You cannot exit fullscreen during the test. Please re-enter fullscreen to continue.
            </p>
            <button
              onClick={() => { onReenterFullscreen(); onDismiss(); }}
              className="btn btn-primary w-full justify-center py-2.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
              </svg>
              Re-enter Fullscreen
            </button>
            <p className="mt-3 text-xs text-[var(--text-muted)] font-mono">
              Tab switches are being tracked
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
