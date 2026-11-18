import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, PerformanceMonitor, Sparkles } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { AdditiveBlending, BufferAttribute, BufferGeometry, MathUtils, type Group } from 'three';
import { Neighborhood } from './Neighborhood';

/**
 * Scène 3D du hero : un quartier low-poly de la banlieue de Dakar au coucher du soleil.
 * - Éclairage doux doré de fin d'après-midi / crépuscule + ombres douces PCFSoft (1024px)
 * - Ciel de coucher de soleil (disque solaire bas à l'horizon + halo atmosphérique / étoiles le soir)
 * - Lampadaire qui s'allume avec cône lumineux, camion de collecte en tournée
 * - Plafond strict < 4 000 triangles, pixel ratio adaptatif [1, 1.5], PerformanceMonitor pour garder 60 fps sur mobile
 * - Rendu suspendu (frameloop "never") dès que le hero sort de l'écran
 */

export type HeroSceneProps = {
  active: boolean;
  dark: boolean;
  onReady?: () => void;
};

type Input = { x: number; y: number; spin: number; dragging: boolean; lastX: number };

export default function HeroScene({ active, dark, onReady }: HeroSceneProps) {
  const input = useRef<Input>({ x: 0, y: 0, spin: 0, dragging: false, lastX: 0 });
  const [dpr, setDpr] = useState(1.35);
  const [shadowsEnabled, setShadowsEnabled] = useState(true);

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
        shadows={shadowsEnabled ? 'soft' : false}
        dpr={dpr}
        frameloop={active ? 'always' : 'never'}
        camera={{ position: [7.2, 5.3, 8.2], fov: 33, near: 0.1, far: 65 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={() => onReady?.()}
      >
        <PerformanceMonitor
          onDecline={() => {
            setDpr(1);
            setShadowsEnabled(false);
          }}
          onIncline={() => {
            setDpr(1.4);
          }}
        />
        <SunsetSkyBackdrop dark={dark} />
        <Lights dark={dark} shadowsEnabled={shadowsEnabled} />
        <Rig input={input}>
          <Float speed={1.35} rotationIntensity={0.1} floatIntensity={0.65} floatingRange={[-0.1, 0.1]}>
            <Neighborhood dark={dark} />
          </Float>
          <Cloud position={[-3.6, 2.55, -1.6]} scale={0.68} speed={0.22} dark={dark} />
          <Cloud position={[3.3, 3.0, -2.3]} scale={0.54} speed={0.16} dark={dark} />
          <Cloud position={[2.7, -1.5, 2.5]} scale={0.44} speed={0.28} dark={dark} />
        </Rig>
        <Sparkles
          count={22}
          scale={[9, 5.5, 9]}
          size={2.2}
          speed={0.25}
          opacity={0.8}
          color={dark ? '#FFD27A' : '#F2A950'}
        />
      </Canvas>
    </div>
  );
}

function SunsetSkyBackdrop({ dark }: { dark: boolean }) {
  const starsGeo = useMemo(() => {
    const count = 90;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = ((i * 73.13) % 360) * (Math.PI / 180);
      const y = 1.5 + ((i * 19) % 100) * 0.08;
      const r = 14 + (i % 5);
      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = -Math.abs(Math.sin(theta) * r) - 4;
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(positions, 3));
    return g;
  }, []);

  return (
    <group position={[-4.2, 2.1, -9.5]} rotation={[0, 0.42, 0]}>
      <mesh position={[0, 0.2, -0.5]}>
        <circleGeometry args={[5.8, 28]} />
        <meshBasicMaterial
          color={dark ? '#2B3A67' : '#F59E42'}
          transparent
          opacity={dark ? 0.34 : 0.26}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, -0.1, -0.3]}>
        <circleGeometry args={[3.6, 26]} />
        <meshBasicMaterial
          color={dark ? '#E07A5F' : '#F47C48'}
          transparent
          opacity={dark ? 0.25 : 0.38}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, -0.25, 0]}>
        <circleGeometry args={[1.65, 24]} />
        <meshBasicMaterial
          color={dark ? '#F2A65A' : '#FFD166'}
          transparent
          opacity={dark ? 0.55 : 0.88}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {dark && (
        <points geometry={starsGeo}>
          <pointsMaterial
            color="#FFF3D1"
            size={0.14}
            transparent
            opacity={0.85}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </points>
      )}
    </group>
  );
}

function Lights({ dark, shadowsEnabled }: { dark: boolean; shadowsEnabled: boolean }) {
  return (
    <>
      <hemisphereLight
        args={[
          dark ? '#748EC4' : '#FFE6C2',
          dark ? '#14231C' : '#C88D5E',
          dark ? 0.95 : 1.45,
        ]}
      />
      <directionalLight
        castShadow={shadowsEnabled}
        position={[-6.5, 6.2, -4.5]}
        intensity={dark ? 0.85 : 2.5}
        color={dark ? '#F2B880' : '#FFD59E'}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={22}
        shadow-camera-left={-4.5}
        shadow-camera-right={4.5}
        shadow-camera-top={4.5}
        shadow-camera-bottom={-4.5}
        shadow-bias={-0.0015}
      />
      <directionalLight
        position={[5, 4, 5]}
        intensity={dark ? 0.35 : 0.75}
        color={dark ? '#4CC9A0' : '#FFF4E0'}
      />
    </>
  );
}

function Rig({ input, children }: { input: MutableRefObject<Input>; children: ReactNode }) {
  const outer = useRef<Group>(null!);
  const inner = useRef<Group>(null!);
  const { size, camera } = useThree();
  const scale = size.width < 420 ? 0.82 : size.width < 768 ? 0.92 : 1;

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.05);
    const p = input.current;
    inner.current.rotation.y += d * 0.12 + p.spin;
    p.spin *= 0.92;
    outer.current.rotation.x = MathUtils.damp(outer.current.rotation.x, -p.y * 0.11, 3, d);
    outer.current.rotation.y = MathUtils.damp(outer.current.rotation.y, p.x * 0.32, 3, d);
    camera.position.y = MathUtils.damp(camera.position.y, 5.3 + p.y * 0.55, 2, d);
    camera.lookAt(0, -0.22, 0);
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
    ref.current.position.x = position[0] + Math.sin(clock.elapsedTime * speed) * 0.48;
  });
  const color = dark ? '#4A5D6E' : '#FFE3C8';
  return (
    <group ref={ref} position={position} scale={scale}>
      <mesh>
        <icosahedronGeometry args={[0.58, 0]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
      <mesh position={[0.58, -0.1, 0.1]}>
        <icosahedronGeometry args={[0.43, 0]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
      <mesh position={[-0.52, -0.14, 0]}>
        <icosahedronGeometry args={[0.38, 0]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
    </group>
  );
}
