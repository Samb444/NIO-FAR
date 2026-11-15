import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'accent';

const base =
  'group inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-base font-semibold transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 active:translate-y-0 select-none';

const variants: Record<Variant, string> = {
  primary: 'bg-ochre text-ink shadow-cta hover:bg-ochre-400',
  secondary: 'glass text-fg shadow-soft hover:bg-bg-elev',
  accent: 'bg-accent text-accent-fg shadow-glow hover:brightness-110',
};

export function ButtonLink({
  to,
  variant = 'primary',
  children,
  className = '',
}: {
  to: string;
  variant?: Variant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link to={to} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}
