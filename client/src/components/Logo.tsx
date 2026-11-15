import { useId } from 'react';

/** Marqueur de position avec une coche. */
export function LogoMark({ className = 'h-9 w-9' }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4CC9A0" />
          <stop offset="1" stopColor="#0B6B4F" />
        </linearGradient>
      </defs>
      <ellipse cx="24" cy="45" rx="8" ry="2" fill="#14231C" opacity=".18" />
      <path d="M24 3C15.2 3 8 10 8 18.7 8 30.5 24 44 24 44s16-13.5 16-25.3C40 10 32.8 3 24 3Z" fill={`url(#${id})`} />
      <circle cx="24" cy="18.5" r="9.5" fill="#F6F1E7" />
      <path
        d="m19.2 18.8 3.4 3.4 6.4-6.8"
        fill="none"
        stroke="#0B6B4F"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark />
      <span className="font-display text-xl font-extrabold tracking-tight">
        NIO <span className="text-accent">FAR</span>
      </span>
    </span>
  );
}
