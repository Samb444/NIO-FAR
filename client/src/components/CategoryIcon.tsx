import { motion } from 'framer-motion';
import type { CategoryId } from '../lib/tokens';
import { categoryColors } from '../lib/tokens';

/** Icônes animées (SVG + Framer Motion), légères et sans WebGL. */
export function CategoryIcon({ id }: { id: CategoryId }) {
  const color = categoryColors[id];
  switch (id) {
    case 'dechets':
      return <TrashIcon color={color} />;
    case 'eau_stagnante':
      return <WaterIcon color={color} />;
    case 'eclairage':
      return <LampIcon color={color} />;
    case 'voirie':
      return <RoadIcon color={color} />;
  }
}

const loop = { repeat: Infinity, ease: 'easeInOut' } as const;

function TrashIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 96 96" className="h-full w-full" aria-hidden>
      <ellipse cx="48" cy="84" rx="26" ry="4" fill="currentColor" opacity=".12" />
      {/* Mouches */}
      {[0, 1].map((i) => (
        <motion.circle
          key={i}
          r="1.8"
          fill="currentColor"
          animate={{ cx: [30 + i * 30, 40 + i * 20, 34 + i * 26, 30 + i * 30], cy: [16, 10 + i * 4, 20, 16] }}
          transition={{ duration: 2.4 + i * 0.6, ...loop }}
        />
      ))}
      <path d="M28 36 h40 l-3.5 40 a5 5 0 0 1 -5 4.5 h-23 a5 5 0 0 1 -5 -4.5z" fill={color} />
      <path d="M38 46 v24 M48 46 v24 M58 46 v24" stroke="#14231C" strokeOpacity=".35" strokeWidth="3" strokeLinecap="round" />
      <motion.g
        style={{ transformBox: 'fill-box', originX: 0, originY: 1 }}
        animate={{ rotate: [0, -24, 0, 0] }}
        transition={{ duration: 2.6, times: [0, 0.25, 0.5, 1], ...loop }}
      >
        <rect x="24" y="27" width="48" height="8" rx="4" fill="#14231C" opacity=".85" />
        <rect x="42" y="22" width="12" height="6" rx="3" fill="#14231C" opacity=".85" />
      </motion.g>
      <motion.circle
        cx="70"
        cy="76"
        r="7"
        fill="#3E5048"
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 2, ...loop }}
      />
    </svg>
  );
}

function WaterIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 96 96" className="h-full w-full" aria-hidden>
      {[0, 1].map((i) => (
        <motion.ellipse
          key={i}
          cx="48"
          cy="74"
          rx="30"
          ry="8"
          fill="none"
          stroke={color}
          strokeWidth="3"
          style={{ transformBox: 'fill-box', originX: 0.5, originY: 0.5 }}
          animate={{ scale: [0.3, 1.15], opacity: [0.9, 0] }}
          transition={{ duration: 2.2, delay: 0.5 + i * 1.1, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}
      <ellipse cx="48" cy="74" rx="22" ry="6" fill={color} opacity=".55" />
      <motion.path
        d="M48 14 C 40 28, 32 36, 32 46 a16 16 0 0 0 32 0 C 64 36, 56 28, 48 14Z"
        fill={color}
        animate={{ y: [-6, 4, -6] }}
        transition={{ duration: 2.2, ...loop }}
      />
      <motion.path
        d="M41 44 a8 8 0 0 0 6 8"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        animate={{ y: [-6, 4, -6] }}
        transition={{ duration: 2.2, ...loop }}
      />
    </svg>
  );
}

function LampIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 96 96" className="h-full w-full" aria-hidden>
      <motion.circle
        cx="62"
        cy="30"
        r="20"
        fill={color}
        animate={{ opacity: [0.15, 0.45, 0.1, 0.4, 0.15] }}
        transition={{ duration: 3, ...loop }}
      />
      <path d="M34 86 V22 a6 6 0 0 1 6 -6 h18" stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M52 20 h20 l-4 10 h-12z" fill="currentColor" />
      <motion.circle
        cx="62"
        cy="32"
        r="5"
        fill={color}
        animate={{ opacity: [1, 0.35, 1, 0.5, 1] }}
        transition={{ duration: 3, ...loop }}
      />
      {[-1, 0, 1].map((k) => (
        <motion.line
          key={k}
          x1={62 + k * 9}
          y1="42"
          x2={62 + k * 15}
          y2="54"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          animate={{ opacity: [0.9, 0.2, 0.9] }}
          transition={{ duration: 1.6, delay: k * 0.2 + 0.2, ...loop }}
        />
      ))}
      <rect x="26" y="84" width="16" height="4" rx="2" fill="currentColor" />
    </svg>
  );
}

function RoadIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 96 96" className="h-full w-full" aria-hidden>
      <path d="M36 12 h24 l24 74 h-72z" fill="currentColor" opacity=".85" />
      <motion.path
        d="M48 16 V84"
        stroke="#F6F1E7"
        strokeWidth="3.5"
        strokeDasharray="8 8"
        animate={{ strokeDashoffset: [0, -32] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
      />
      <ellipse cx="38" cy="62" rx="9" ry="4.5" fill="#0d1210" />
      <motion.g animate={{ y: [0, -3, 0] }} transition={{ duration: 1.8, ...loop }}>
        <path d="M70 46 l7 22 h-14z" fill={color} />
        <path d="M67.5 54 h5 M66 60 h8" stroke="#fff" strokeWidth="2.5" />
        <rect x="60" y="67" width="20" height="4" rx="1.5" fill={color} />
      </motion.g>
    </svg>
  );
}
