import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Html } from '@react-three/drei';
import { useRef, useState } from 'react';
import { MathUtils, type Group, type Mesh } from 'three';

export type SectorDatum = {
  secteur: string;
  total: number;
  resolus: number;
  aTraiter: number;
};

export default function SectorBars3D({
  items,
  dark,
}: {
  items: SectorDatum[];
  dark: boolean;
}) {
  const [actif, setActif] = useState<string | null>(items[0]?.secteur ?? null);
  const spinRef = useRef({ dragging: false, lastX: 0, angle: -0.25 });

  const maxTotal = Math.max(1, ...items.map((x) => x.total));

  return (
    <div
      className="relative h-80 w-full cursor-grab overflow-hidden rounded-3xl border border-line bg-bg active:cursor-grabbing sm:h-96"
      onPointerDown={(e) => {
        spinRef.current.dragging = true;
        spinRef.current.lastX = e.clientX;
      }}
      onPointerMove={(e) => {
        if (!spinRef.current.dragging) return;
        spinRef.current.angle += (e.clientX - spinRef.current.lastX) * 0.008;
        spinRef.current.lastX = e.clientX;
      }}
      onPointerUp={() => {
        spinRef.current.dragging = false;
      }}
      onPointerLeave={() => {
        spinRef.current.dragging = false;
      }}
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 5.2, 8.6], fov: 36, near: 0.1, far: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <ambientLight intensity={dark ? 0.85 : 1.3} />
        <directionalLight position={[5, 9, 6]} intensity={dark ? 1.1 : 1.8} color={dark ? '#A9BCFF' : '#FFF4E0'} />
        <directionalLight position={[-5, 4, -4]} intensity={0.4} color="#4CC9A0" />

        <ScenePlateforme
          items={items}
          maxTotal={maxTotal}
          dark={dark}
          actif={actif}
          onSelect={setActif}
          spinRef={spinRef}
        />
      </Canvas>

      <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-bg-elev/85 px-3.5 py-2 text-xs backdrop-blur-md">
        <span className="font-semibold text-fg-muted">
          Glissez pour faire pivoter · Cliquez sur une barre 3D
        </span>
        <div className="flex items-center gap-3 font-semibold">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#E0A21B]" /> À traiter
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#0B6B4F]" /> Résolus
          </span>
        </div>
      </div>
    </div>
  );
}

function ScenePlateforme({
  items,
  maxTotal,
  dark,
  actif,
  onSelect,
  spinRef,
}: {
  items: SectorDatum[];
  maxTotal: number;
  dark: boolean;
  actif: string | null;
  onSelect: (s: string) => void;
  spinRef: React.MutableRefObject<{ dragging: boolean; lastX: number; angle: number }>;
}) {
  const groupRef = useRef<Group>(null!);

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.05);
    if (!spinRef.current.dragging) {
      spinRef.current.angle += d * 0.12;
    }
    groupRef.current.rotation.y = MathUtils.damp(
      groupRef.current.rotation.y,
      spinRef.current.angle,
      5,
      d,
    );
  });

  const n = items.length;
  const rayon = Math.max(2.2, Math.min(3.4, n * 0.42));

  return (
    <Float speed={1.2} rotationIntensity={0.04} floatIntensity={0.25}>
      <group ref={groupRef} position={[0, -1.1, 0]}>
        {/* Socle circulaire low-poly */}
        <mesh position={[0, -0.18, 0]}>
          <cylinderGeometry args={[rayon + 1.1, rayon + 1.3, 0.35, 24]} />
          <meshLambertMaterial color={dark ? '#1B2E25' : '#E5DCC8'} flatShading />
        </mesh>
        <mesh position={[0, 0.01, 0]}>
          <cylinderGeometry args={[rayon + 0.85, rayon + 0.85, 0.04, 24]} />
          <meshLambertMaterial color={dark ? '#263F34' : '#F6F1E7'} flatShading />
        </mesh>

        {items.map((item, idx) => {
          const angle = (idx / Math.max(1, n)) * Math.PI * 2;
          const x = Math.cos(angle) * rayon;
          const z = Math.sin(angle) * rayon;
          const hTotal = Math.max(0.35, (item.total / maxTotal) * 2.8);
          const hResolus = item.total > 0 ? (item.resolus / item.total) * hTotal : 0;
          const hATraiter = Math.max(0.08, hTotal - hResolus);
          const estActif = actif === item.secteur;

          return (
            <BarreSecteur
              key={item.secteur}
              item={item}
              position={[x, 0, z]}
              hResolus={hResolus}
              hATraiter={hATraiter}
              estActif={estActif}
              onSelect={() => onSelect(item.secteur)}
            />
          );
        })}
      </group>
    </Float>
  );
}

function BarreSecteur({
  item,
  position,
  hResolus,
  hATraiter,
  estActif,
  onSelect,
}: {
  item: SectorDatum;
  position: [number, number, number];
  hResolus: number;
  hATraiter: number;
  estActif: boolean;
  onSelect: () => void;
}) {
  const meshRef = useRef<Mesh>(null!);
  const [survol, setSurvol] = useState(false);
  const hTotale = hResolus + hATraiter;

  return (
    <group position={position}>
      {/* Partie basse : résolus */}
      {hResolus > 0.02 && (
        <mesh
          ref={meshRef}
          position={[0, hResolus / 2, 0]}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          onPointerOver={() => setSurvol(true)}
          onPointerOut={() => setSurvol(false)}
        >
          <boxGeometry args={[0.58, hResolus, 0.58]} />
          <meshLambertMaterial color={estActif || survol ? '#4CC9A0' : '#0B6B4F'} flatShading />
        </mesh>
      )}

      {/* Partie haute : à traiter */}
      <mesh
        position={[0, hResolus + hATraiter / 2, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={() => setSurvol(true)}
        onPointerOut={() => setSurvol(false)}
      >
        <boxGeometry args={[0.58, hATraiter, 0.58]} />
        <meshLambertMaterial color={estActif || survol ? '#F2C94C' : '#E0A21B'} flatShading />
      </mesh>

      <Html position={[0, hTotale + 0.45, 0]} center distanceFactor={11}>
        <button
          type="button"
          onClick={onSelect}
          className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm transition-transform ${
            estActif
              ? 'scale-110 bg-accent text-accent-fg ring-2 ring-ochre'
              : 'bg-bg-elev/90 text-fg hover:scale-105'
          }`}
        >
          {item.secteur} ({item.total})
        </button>
      </Html>
    </group>
  );
}
