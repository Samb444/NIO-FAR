import { categoryColors } from '../lib/tokens';

/**
 * Illustration statique (SVG) du quartier flottant.
 * Utilisée pendant le chargement de la 3D, si WebGL est indisponible,
 * si l'économiseur de données est actif ou si prefers-reduced-motion est activé.
 */
export function HeroFallback({ className = '' }: { className?: string }) {
  const pins: { x: number; y: number; c: string }[] = [
    { x: 92, y: 168, c: categoryColors.dechets },
    { x: 196, y: 214, c: categoryColors.eau_stagnante },
    { x: 300, y: 112, c: categoryColors.eclairage },
    { x: 236, y: 178, c: categoryColors.voirie },
  ];
  return (
    <svg
      viewBox="0 0 400 380"
      className={`h-full w-full ${className}`}
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id="fb-glow" cx="50%" cy="45%" r="50%">
          <stop offset="0" stopColor="#4CC9A0" stopOpacity=".35" />
          <stop offset="1" stopColor="#4CC9A0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="fb-rock" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B98257" />
          <stop offset="1" stopColor="#7E5A3E" />
        </linearGradient>
      </defs>
      <circle cx="200" cy="190" r="180" fill="url(#fb-glow)" />

      <g className="nf-bob">
        {/* Socle rocheux */}
        <path d="M58 206 L342 206 L300 268 L232 330 L200 352 L168 330 L100 268 Z" fill="url(#fb-rock)" />
        <path d="M200 352 L232 330 L300 268 L342 206 L270 206 Z" fill="#000" opacity=".12" />
        {/* Sable + pelouse */}
        <ellipse cx="200" cy="206" rx="144" ry="56" fill="#B98257" />
        <ellipse cx="200" cy="198" rx="144" ry="56" fill="#EAD9B0" />
        <ellipse cx="200" cy="194" rx="134" ry="50" fill="#6CC495" />

        {/* Route */}
        <path d="M86 226 L304 152 L322 164 L108 240 Z" fill="#3A4741" />
        <path d="M120 222 l18 -6 M160 208 l18 -6 M240 181 l18 -6 M280 167 l18 -6" stroke="#F6F1E7" strokeWidth="3" strokeLinecap="round" />

        {/* Maisons rangée arrière */}
        <g>
          <path d="M120 150 h40 v34 h-40 z" fill="#F6F1E7" />
          <path d="M160 150 l14 -8 v34 l-14 8 z" fill="#D9CFBC" />
          <path d="M116 152 l24 -22 l24 22 l14 -8 l-24 -20 l-14 8 z" fill="#E0A21B" />
          <rect x="128" y="166" width="9" height="18" fill="#5B3A29" />
        </g>
        <g>
          <path d="M180 120 h44 v52 h-44 z" fill="#F3D9A4" />
          <path d="M224 120 l14 -8 v52 l-14 8 z" fill="#D8BC83" />
          <path d="M178 116 h48 l14 -8 h-48 z" fill="#0B6B4F" />
          <rect x="188" y="130" width="9" height="8" fill="#9CCFE0" />
          <rect x="206" y="130" width="9" height="8" fill="#9CCFE0" />
          <rect x="197" y="154" width="10" height="18" fill="#0B6B4F" />
        </g>
        {/* Maison avant */}
        <g>
          <path d="M150 222 h38 v30 h-38 z" fill="#CDEBDD" />
          <path d="M188 222 l12 -6 v30 l-12 6 z" fill="#A9D3BF" />
          <path d="M148 219 h42 l12 -6 h-42 z" fill="#C8553D" />
        </g>

        {/* Baobab */}
        <rect x="262" y="160" width="12" height="30" rx="4" fill="#9C7B5E" />
        <ellipse cx="268" cy="156" rx="30" ry="12" fill="#3E9B6E" />

        {/* Lampadaire */}
        <path d="M300 186 V118 h-14" stroke="#2B3A33" strokeWidth="4" fill="none" strokeLinecap="round" />
        <circle cx="284" cy="122" r="5" fill="#F2C94C" />

        {/* Bac à déchets */}
        <rect x="84" y="186" width="18" height="22" rx="2" fill="#0B6B4F" />
        <rect x="82" y="182" width="22" height="5" rx="2" fill="#08523D" />
        <circle cx="108" cy="204" r="5" fill="#3E5048" />

        {/* Flaque */}
        <ellipse cx="200" cy="248" rx="20" ry="6" fill="#2F8FBF" opacity=".9" />

        {/* Marqueurs */}
        {pins.map((p) => (
          <g key={p.c} transform={`translate(${p.x} ${p.y})`}>
            <ellipse cx="0" cy="34" rx="10" ry="3.5" fill={p.c} className="nf-pulse" opacity=".7" />
            <path d="M0 0c-8 0-14 6-14 13.5C-14 24 0 34 0 34s14-10 14-20.5C14 6 8 0 0 0Z" fill={p.c} />
            <circle cx="0" cy="13" r="5" fill="#fff" />
          </g>
        ))}
      </g>
    </svg>
  );
}
