import { Dumbbell, Loader2 } from 'lucide-react';

export function FullScreenLoader() {
  return (
    <div className="min-h-screen grid place-items-center bg-ink-950">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="grid place-items-center w-14 h-14 rounded-2xl bg-neon-400 text-ink-950 shadow-glow animate-pulse-ring">
          <Dumbbell className="w-7 h-7" strokeWidth={2.5} />
        </div>
        <div className="flex items-center gap-2 text-ink-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando…
        </div>
      </div>
    </div>
  );
}

export function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
  return <Loader2 className={`${className} animate-spin`} />;
}
