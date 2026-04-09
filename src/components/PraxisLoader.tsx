import { useEffect, useState } from 'react';

const LINES = [
  '> Initializing PRAXIS...',
  '> Loading modules...',
  '> Compiling environment...',
  '> Ready.',
];

interface Props {
  onDone: () => void;
}

export const PraxisLoader = ({ onDone }: Props) => {
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleLines(i);
      if (i >= LINES.length) {
        clearInterval(interval);
        // Short pause then fade out
        setTimeout(() => {
          setFading(true);
          setTimeout(onDone, 500);
        }, 400);
      }
    }, 380);
    return () => clearInterval(interval);
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-base"
      style={{ opacity: fading ? 0 : 1, transition: 'opacity 0.5s ease' }}
    >
      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--accent-dim)] border border-[rgba(0,255,136,0.3)] mb-4 animate-pulse-glow">
          <span className="font-mono font-bold text-accent text-base">&gt;_</span>
        </div>
        <h1 className="font-display font-bold text-3xl text-[var(--text-primary)] tracking-widest">
          PRAXIS
        </h1>
      </div>

      {/* Terminal log lines */}
      <div className="w-full max-w-xs font-mono text-xs space-y-2">
        {LINES.map((line, i) => (
          <div
            key={i}
            className="flex items-center gap-2"
            style={{
              opacity: i < visibleLines ? 1 : 0,
              transform: i < visibleLines ? 'translateY(0)' : 'translateY(6px)',
              transition: 'opacity 0.25s ease, transform 0.25s ease',
            }}
          >
            <span className={i === LINES.length - 1 ? 'text-accent' : 'text-[var(--text-muted)]'}>
              {line}
            </span>
            {/* Blinking cursor on last visible line */}
            {i === visibleLines - 1 && i < LINES.length - 1 && (
              <span className="w-1.5 h-3.5 bg-accent inline-block cursor-blink" />
            )}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mt-10 w-48 progress-bar">
        <div
          className="progress-fill"
          style={{
            width: `${(visibleLines / LINES.length) * 100}%`,
            transition: 'width 0.35s ease',
          }}
        />
      </div>
    </div>
  );
};
