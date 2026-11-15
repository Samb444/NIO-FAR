import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';
import { useEffect, useRef, type MutableRefObject, type ReactNode } from 'react';
import { MathUtils, type Group } from 'three';
import { Neighborhood } from './Neighborhood';

/**
 * Scène 3D du hero : un quartier low-poly sur une île flottante.
 * - Chargée en lazy-loading (import dynamique depuis Hero.tsx)
 * - Pixel ratio plafonné à 1.5, pas d'ombres temps réel ni de post-traitement
 * - Rendu suspendu (frameloop "never") quand le hero n'est plus visible
 */

export type HeroSceneProps = {
  active: boolean;
  dark: boolean;
  onReady?: () => void;
};

type Input = { x: number; y: number; spin: number; dragging: boolean; lastX: number };

export default function HeroScene({ active, dark, onReady }: HeroSceneProps) {
  const input = useRef<Input>({ x: 0, y: 0, spin: 0, dragging: false, lastX: 0 });

  // Parallaxe : suit la souris / le doigt sur toute la fenêtre
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      input.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      input.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
    };
  }, []);

  const endDrag = () => {
    input.current.dragging = false;
  };

  return (
    <div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{ touchAction: 'pan-y' }}
      onPointerDown={(e) => {
        input.current.dragging = true;
        input.current.lastX = e.clientX;
      }}
      onPointerMove={(e) => {
        if (!input.current.dragging) return;
        input.current.spin += (e.clientX - input.current.lastX) * 0.0025;
        input.current.lastX = e.clientX;
      }}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
    >
      <Canvas
        dpr={[1, 1.5]}
        frameloop={active ? 'always' : 'never'}
        camera={{ position: [7.2, 5.4, 8.2], fov: 33, near: 0.1, far: 60 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={() => onReady?.()}
      >
        <Lights dark={dark} />
        <Rig input={input}>
          <Float speed={1.4} rotationIntensity={0.12} floatIntensity={0.7} floatingRange={[-0.12, 0.12]}>
            <Neighborhood dark={dark} />
          </Float>
          <Cloud position={[-3.6, 2.6, -1.5]} scale={0.7} speed={0.25} dark={dark} />
          <Cloud position={[3.4, 3.1, -2.4]} scale={0.55} speed={0.18} dark={dark} />
          <Cloud position={[2.8, -1.6, 2.6]} scale={0.45} speed={0.3} dark={dark} />
        </Rig>
        <Sparkles
          count={26}
          scale={[10, 6, 10]}
          size={2.4}
          speed={0.3}
          opacity={0.85}
          color={dark ? '#F2C94C' : '#4CC9A0'}
        />
      </Canvas>
    </div>
  );
}

function Lights({ dark }: { dark: boolean }) {
  return (
    <>
      <hemisphereLight args={[dark ? '#6C86B8' : '#FFFFFF', dark ? '#14231C' : '#C9A27A', dark ? 0.9 : 1.5]} />
      <directionalLight position={[5, 8, 4]} intensity={dark ? 0.7 : 2.4} color={dark ? '#A9BCFF' : '#FFF1DA'} />
      <directionalLight position={[-6, 3, -4]} intensity={dark ? 0.25 : 0.5} color={dark ? '#4CC9A0' : '#FFE2B0'} />
    </>
  );
}

function Rig({ input, children }: { input: MutableRefObject<Input>; children: ReactNode }) {
  const outer = useRef<Group>(null!);
  const inner = useRef<Group>(null!);
  const { size, camera } = useThree();
  const scale = size.width < 420 ? 0.8 : size.width < 768 ? 0.9 : 1;

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.05);
    const p = input.current;
    // Rotation automatique + élan donné au doigt / à la souris
    inner.current.rotation.y += d * 0.14 + p.spin;
    p.spin *= 0.92;
    // Parallaxe douce
    outer.current.rotation.x = MathUtils.damp(outer.current.rotation.x, -p.y * 0.12, 3, d);
    outer.current.rotation.y = MathUtils.damp(outer.current.rotation.y, p.x * 0.35, 3, d);
    camera.position.y = MathUtils.damp(camera.position.y, 5.4 + p.y * 0.6, 2, d);
    camera.lookAt(0, -0.25, 0);
  });

  return (
    <group ref={outer} scale={scale}>
      <group ref={inner}>{children}</group>
    </group>
  );
}

function Cloud({
  position,
  scale,
  speed,
  dark,
}: {
  position: [number, number, number];
  scale: number;
  speed: number;
  dark: boolean;
}) {
  const ref = useRef<Group>(null!);
  useFrame(({ clock }) => {
    ref.current.position.x = position[0] + Math.sin(clock.elapsedTime * speed) * 0.5;
  });
  const color = dark ? '#3A5248' : '#FFFFFF';
  return (
    <group ref={ref} position={position} scale={scale}>
      <mesh>
        <icosahedronGeometry args={[0.6, 0]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
      <mesh position={[0.6, -0.1, 0.1]}>
        <icosahedronGeometry args={[0.45, 0]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
      <mesh position={[-0.55, -0.15, 0]}>
        <icosahedronGeometry args={[0.4, 0]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
    </group>
  );
}

