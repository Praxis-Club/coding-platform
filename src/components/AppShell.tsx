import type { ReactNode } from 'react';

type AppShellProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Wider layout for data-heavy pages */
  wide?: boolean;
};

export const AppShell = ({ title, subtitle, actions, children, wide }: AppShellProps) => {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-950 text-slate-100">
      <div className={`mx-auto px-4 sm:px-6 lg:px-8 py-8 ${wide ? 'max-w-[1600px]' : 'max-w-7xl'}`}>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2 shrink-0">{actions}</div> : null}
        </div>
        {children}
      </div>
    </div>
  );
};
