import { initials } from '@/lib/utils';

export function Avatar({
  name,
  size = 'md',
  ring = false,
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  ring?: boolean;
}) {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
  };
  return (
    <div
      className={`grid place-items-center rounded-full bg-gradient-to-br from-neon-400/30 to-accent/20 text-neon-100 font-bold ${sizes[size]} ${
        ring ? 'ring-2 ring-neon-400/40 ring-offset-2 ring-offset-ink-900' : ''
      }`}
    >
      {initials(name) || '?'}
    </div>
  );
}
