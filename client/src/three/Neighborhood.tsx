import { useFrame } from '@react-three/fiber';
import { useRef, type MutableRefObject } from 'react';
import type { Group, Mesh, MeshBasicMaterial, PointLight } from 'three';
import { categoryColors } from '../lib/tokens';
import { Marker } from './Marker';

const GROUND_Y = 0.25;

type V3 = [number, number, number];

export function Neighborhood({ dark }: { dark: boolean }) {
  const bagsRef = useRef<Group>(null!);

  return (
    <group position={[0, -0.2, 0]}>
      <Island dark={dark} />
      <group rotation={[0, 0.35, 0]}>
        <Road />
        <House position={[-1.65, GROUND_Y, -1.25]} body="#F6F1E7" roof="#E0A21B" dark={dark} />
        <FlatHouse position={[-0.35, GROUND_Y, -1.3]} body="#F3D9A4" trim="#0B6B4F" dark={dark} tall />
        <House position={[1.05, GROUND_Y, -1.25]} body="#E8B4A0" roof="#8A9A93" dark={dark} />
        <FlatHouse position={[-1.2, GROUND_Y, 1.4]} rotation={Math.PI} body="#CDEBDD" trim="#C8553D" dark={dark} />
        <House position={[0.85, GROUND_Y, 1.42]} rotation={Math.PI} body="#FAF7F0" roof="#C8553D" dark={dark} />

        <Lamppost position={[1.95, GROUND_Y, 0.72]} dark={dark} />
        <TrashBin position={[-2.1, GROUND_Y, 0.78]} bagsRef={bagsRef} />
        <GarbageTruck bagsRef={bagsRef} />

        <Puddle position={[-0.18, GROUND_Y, 1.12]} />
        <Pothole position={[0.55, 0, 0.22]} />

        <Baobab position={[2.15, GROUND_Y, -1.2]} />
        <Tree position={[-2.35, GROUND_Y, -0.55]} scale={0.9} />
        <Tree position={[-0.75, GROUND_Y, -2.25]} scale={0.75} />
        <Tree position={[0.25, GROUND_Y, 2.3]} scale={0.8} />
        <Tree position={[2.35, GROUND_Y, 1.55]} scale={0.65} />

        <Marker position={[-2.1, GROUND_Y, 0.78]} height={1.2} color={categoryColors.dechets} phase={0} />
        <Marker position={[-0.18, GROUND_Y, 1.12]} height={0.95} color={categoryColors.eau_stagnante} phase={0.9} />
        <Marker position={[1.95, GROUND_Y, 0.72]} height={2.05} color={categoryColors.eclairage} phase={1.7} />
        <Marker position={[0.55, GROUND_Y, 0.22]} height={1.0} color={categoryColors.voirie} phase={2.4} />
      </group>
    </group>
  );
}

function Island({ dark }: { dark: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <cylinderGeometry args={[3.3, 3.1, 0.3, 12]} />
        <meshLambertMaterial color={dark ? '#C9B98F' : '#EAD9B0'} flatShading />
      </mesh>
      <mesh position={[0, 0.16, 0]} receiveShadow>
        <cylinderGeometry args={[3.08, 3.08, 0.18, 12]} />
        <meshLambertMaterial color={dark ? '#2E7D5B' : '#6CC495'} flatShading />
      </mesh>
      <mesh position={[0, -1.35, 0]} rotation={[Math.PI, 0.3, 0]}>
        <coneGeometry args={[3.15, 2.5, 10]} />
        <meshLambertMaterial color={dark ? '#6E4C35' : '#A8724A'} flatShading />
      </mesh>
      <mesh position={[0, -0.35, 0]}>
        <cylinderGeometry args={[3.12, 3.0, 0.5, 10]} />
        <meshLambertMaterial color={dark ? '#7E5A3E' : '#B98257'} flatShading />
      </mesh>
      <Rock position={[1.8, -1.3, 1.2]} scale={0.45} dark={dark} />
      <Rock position={[-1.6, -1.6, -0.9]} scale={0.38} dark={dark} />
      <Rock position={[0.6, -3.0, -0.4]} scale={0.3} dark={dark} />
      <Rock position={[-0.9, -3.3, 0.8]} scale={0.18} dark={dark} />
    </group>
  );
}

function Rock({ position, scale, dark }: { position: V3; scale: number; dark: boolean }) {
  return (
    <mesh position={position} scale={scale} rotation={[0.4, 0.7, 0.2]}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshLambertMaterial color={dark ? '#5E412E' : '#94633F'} flatShading />
    </mesh>
  );
}

function Road() {
  const y = GROUND_Y + 0.02;
  return (
    <group>
      <mesh position={[0, y, 0]} receiveShadow>
        <boxGeometry args={[5.9, 0.04, 0.98]} />
        <meshLambertMaterial color="#3A4741" />
      </mesh>
      <mesh position={[0, y - 0.005, 0.56]} receiveShadow>
        <boxGeometry args={[5.7, 0.05, 0.14]} />
        <meshLambertMaterial color="#D8CDB4" />
      </mesh>
      <mesh position={[0, y - 0.005, -0.56]} receiveShadow>
        <boxGeometry args={[5.7, 0.05, 0.14]} />
        <meshLambertMaterial color="#D8CDB4" />
      </mesh>
      {[-2.2, -1.3, -0.4, 1.4, 2.3].map((x) => (
        <mesh key={x} position={[x, y + 0.022, 0]}>
          <boxGeometry args={[0.42, 0.005, 0.07]} />
          <meshBasicMaterial color="#F6F1E7" />
        </mesh>
      ))}
    </group>
  );
}

function Windows({ dark, z, xs, y }: { dark: boolean; z: number; xs: number[]; y: number }) {
  return (
    <>
      {xs.map((x) => (
        <mesh key={x} position={[x, y, z]}>
          <boxGeometry args={[0.17, 0.15, 0.02]} />
          <meshBasicMaterial color={dark ? '#FFD27A' : '#FFE29E'} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

function House({
  position,
  rotation = 0,
  body,
  roof,
  dark,
}: {
  position: V3;
  rotation?: number;
  body: string;
  roof: string;
  dark: boolean;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.36, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.72, 0.8]} />
        <meshLambertMaterial color={body} flatShading />
      </mesh>
      <mesh position={[0, 0.97, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.74, 0.5, 4]} />
        <meshLambertMaterial color={roof} flatShading />
      </mesh>
      <mesh position={[-0.18, 0.2, 0.405]}>
        <boxGeometry args={[0.2, 0.38, 0.02]} />
        <meshLambertMaterial color="#5B3A29" />
      </mesh>
      <Windows dark={dark} z={0.405} xs={[0.2]} y={0.42} />
    </group>
  );
}

function FlatHouse({
  position,
  rotation = 0,
  body,
  trim,
  dark,
  tall = false,
}: {
  position: V3;
  rotation?: number;
  body: string;
  trim: string;
  dark: boolean;
  tall?: boolean;
}) {
  const h = tall ? 1.15 : 0.75;
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.0, h, 0.85]} />
        <meshLambertMaterial color={body} flatShading />
      </mesh>
      <mesh position={[0, h + 0.04, 0]} castShadow>
        <boxGeometry args={[1.06, 0.08, 0.91]} />
        <meshLambertMaterial color={trim} flatShading />
      </mesh>
      <mesh position={[0.28, h + 0.2, -0.18]} castShadow>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshLambertMaterial color={body} flatShading />
      </mesh>
      <mesh position={[0, 0.2, 0.43]}>
        <boxGeometry args={[0.22, 0.4, 0.02]} />
        <meshLambertMaterial color={trim} />
      </mesh>
      <Windows dark={dark} z={0.43} xs={[-0.3, 0.3]} y={0.45} />
      {tall && <Windows dark={dark} z={0.43} xs={[-0.3, 0, 0.3]} y={0.88} />}
    </group>
  );
}

function Lamppost({ position, dark }: { position: V3; dark: boolean }) {
  const bulbMat = useRef<MeshBasicMaterial>(null!);
  const coneMat = useRef<MeshBasicMaterial>(null!);
  const groundGlowMat = useRef<MeshBasicMaterial>(null!);
  const lightRef = useRef<PointLight>(null!);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    let factor = 0;
    if (t > 0.8 && t < 1.0) factor = 0.65;
    else if (t >= 1.0 && t < 1.15) factor = 0.15;
    else if (t >= 1.15 && t < 1.32) factor = 0.85;
    else if (t >= 1.32 && t < 1.44) factor = 0.3;
    else if (t >= 1.44) {
      factor = Math.min(1, (t - 1.44) * 2.2) * (0.94 + Math.sin(t * 4) * 0.06);
    }

    const baseStrength = dark ? 1.0 : 0.78;
    const k = factor * baseStrength;

    if (bulbMat.current) bulbMat.current.color.set(k > 0.25 ? '#FFD27A' : '#8A9A93');
    if (coneMat.current) coneMat.current.opacity = k * (dark ? 0.22 : 0.14);
    if (groundGlowMat.current) groundGlowMat.current.opacity = k * (dark ? 0.38 : 0.24);
    if (lightRef.current) lightRef.current.intensity = k * (dark ? 7.5 : 4.2);
  });

  return (
    <group position={position} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0, 0.72, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.06, 1.44, 6]} />
        <meshLambertMaterial color="#2B3A33" />
      </mesh>
      <mesh position={[-0.2, 1.42, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, 0.42, 5]} />
        <meshLambertMaterial color="#2B3A33" />
      </mesh>
      <mesh position={[-0.4, 1.38, 0]}>
        <boxGeometry args={[0.2, 0.07, 0.13]} />
        <meshLambertMaterial color="#2B3A33" />
      </mesh>
      <mesh position={[-0.4, 1.33, 0]}>
        <sphereGeometry args={[0.065, 8, 6]} />
        <meshBasicMaterial ref={bulbMat} color="#FFD27A" toneMapped={false} />
      </mesh>
      <mesh position={[-0.4, 0.68, 0]}>
        <coneGeometry args={[0.52, 1.3, 12, 1, true]} />
        <meshBasicMaterial
          ref={coneMat}
          color="#FFD27A"
          transparent
          opacity={0.18}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.4, 0.025, 0]}>
        <circleGeometry args={[0.55, 14]} />
        <meshBasicMaterial
          ref={groundGlowMat}
          color="#FFD27A"
          transparent
          opacity={0.28}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <pointLight ref={lightRef} position={[-0.4, 1.22, 0]} color="#FFC560" intensity={5} distance={3.8} decay={2} />
    </group>
  );
}

function GarbageTruck({ bagsRef }: { bagsRef: MutableRefObject<Group> }) {
  const truckRef = useRef<Group>(null!);
  const wheelFL = useRef<Mesh>(null!);
  const wheelFR = useRef<Mesh>(null!);
  const wheelRL = useRef<Mesh>(null!);
  const wheelRR = useRef<Mesh>(null!);

  useFrame(({ clock }, delta) => {
    const cycle = 11;
    const t = clock.elapsedTime % cycle;
    let x = -2.7;
    let speed = 0;

    if (t < 2.2) {
      const k = t / 2.2;
      x = -2.7 + k * 0.95;
      speed = 0.43;
    } else if (t < 4.4) {
      x = -1.75;
      speed = 0;
    } else if (t < 9.8) {
      const k = (t - 4.4) / 5.4;
      x = -1.75 + k * 4.45;
      speed = 0.82;
    } else {
      x = 2.7;
      speed = 0;
    }

    const edgeDist = Math.min(2.7 - Math.abs(x), 0.45) / 0.45;
    const s = Math.max(0.01, Math.min(1, edgeDist));

    if (truckRef.current) {
      truckRef.current.position.x = x;
      truckRef.current.position.y = GROUND_Y + 0.04 + (speed > 0 ? Math.sin(clock.elapsedTime * 18) * 0.005 : 0);
      truckRef.current.scale.setScalar(s);
    }

    const rotDelta = delta * speed * 11;
    if (wheelFL.current) wheelFL.current.rotation.z -= rotDelta;
    if (wheelFR.current) wheelFR.current.rotation.z -= rotDelta;
    if (wheelRL.current) wheelRL.current.rotation.z -= rotDelta;
    if (wheelRR.current) wheelRR.current.rotation.z -= rotDelta;

    if (bagsRef.current) {
      let bagScale = 1;
      if (t >= 2.5 && t < 3.4) {
        bagScale = Math.max(0, 1 - (t - 2.5) / 0.9);
      } else if (t >= 3.4 && t < 8.8) {
        bagScale = 0.001;
      } else if (t >= 8.8 && t < 10.0) {
        bagScale = Math.min(1, (t - 8.8) / 1.2);
      }
      bagsRef.current.scale.setScalar(bagScale);
    }
  });

  return (
    <group ref={truckRef} position={[-1.75, GROUND_Y + 0.04, -0.2]}>
      <mesh position={[-0.14, 0.23, 0]} castShadow>
        <boxGeometry args={[0.52, 0.3, 0.34]} />
        <meshLambertMaterial color="#0B6B4F" flatShading />
      </mesh>
      <mesh position={[-0.14, 0.39, 0]}>
        <boxGeometry args={[0.48, 0.04, 0.3]} />
        <meshLambertMaterial color="#4CC9A0" flatShading />
      </mesh>
      <mesh position={[-0.41, 0.21, 0]} rotation={[0, 0, 0.18]}>
        <boxGeometry args={[0.08, 0.26, 0.32]} />
        <meshLambertMaterial color="#E0A21B" flatShading />
      </mesh>
      <mesh position={[0.24, 0.19, 0]} castShadow>
        <boxGeometry args={[0.24, 0.24, 0.32]} />
        <meshLambertMaterial color="#F6F1E7" flatShading />
      </mesh>
      <mesh position={[0.365, 0.22, 0]}>
        <boxGeometry args={[0.02, 0.11, 0.26]} />
        <meshBasicMaterial color="#9CCFE0" />
      </mesh>
      <mesh position={[0.365, 0.12, 0.1]}>
        <boxGeometry args={[0.02, 0.04, 0.05]} />
        <meshBasicMaterial color="#FFD27A" toneMapped={false} />
      </mesh>
      <mesh position={[0.365, 0.12, -0.1]}>
        <boxGeometry args={[0.02, 0.04, 0.05]} />
        <meshBasicMaterial color="#FFD27A" toneMapped={false} />
      </mesh>
      <mesh position={[0.24, 0.33, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.04, 6]} />
        <meshBasicMaterial color="#E0A21B" toneMapped={false} />
      </mesh>
      <mesh ref={wheelFL} position={[0.22, 0.07, 0.17]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.05, 8]} />
        <meshLambertMaterial color="#14231C" />
      </mesh>
      <mesh ref={wheelFR} position={[0.22, 0.07, -0.17]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.05, 8]} />
        <meshLambertMaterial color="#14231C" />
      </mesh>
      <mesh ref={wheelRL} position={[-0.22, 0.07, 0.17]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.05, 8]} />
        <meshLambertMaterial color="#14231C" />
      </mesh>
      <mesh ref={wheelRR} position={[-0.22, 0.07, -0.17]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.05, 8]} />
        <meshLambertMaterial color="#14231C" />
      </mesh>
    </group>
  );
}

function TrashBin({
  position,
  bagsRef,
}: {
  position: V3;
  bagsRef: MutableRefObject<Group>;
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[0.36, 0.44, 0.3]} />
        <meshLambertMaterial color="#0B6B4F" flatShading />
      </mesh>
      <mesh position={[-0.02, 0.48, 0]} rotation={[0, 0, 0.25]}>
        <boxGeometry args={[0.4, 0.05, 0.34]} />
        <meshLambertMaterial color="#08523D" flatShading />
      </mesh>
      <group ref={bagsRef}>
        <mesh position={[0.3, 0.1, 0.12]} scale={[1, 0.8, 1]}>
          <dodecahedronGeometry args={[0.13, 0]} />
          <meshLambertMaterial color="#3E5048" flatShading />
        </mesh>
        <mesh position={[0.22, 0.08, -0.17]}>
          <dodecahedronGeometry args={[0.1, 0]} />
          <meshLambertMaterial color="#2A2F2C" flatShading />
        </mesh>
        <mesh position={[-0.05, 0.53, 0.02]}>
          <dodecahedronGeometry args={[0.11, 0]} />
          <meshLambertMaterial color="#E0A21B" flatShading />
        </mesh>
      </group>
    </group>
  );
}

function Puddle({ position }: { position: V3 }) {
  return (
    <group position={[position[0], position[1] + 0.006, position[2]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0.4]} scale={[1.35, 0.85, 1]}>
        <circleGeometry args={[0.36, 9]} />
        <meshLambertMaterial color="#2F8FBF" transparent opacity={0.85} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.45, 0.001, 0.12]}>
        <circleGeometry args={[0.13, 7]} />
        <meshLambertMaterial color="#2F8FBF" transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

function Pothole({ position }: { position: V3 }) {
  const y = GROUND_Y + 0.043;
  return (
    <group position={[position[0], 0, position[2]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} scale={[1.3, 1, 1]}>
        <circleGeometry args={[0.17, 7]} />
        <meshBasicMaterial color="#161B18" />
      </mesh>
      <mesh position={[0.38, GROUND_Y + 0.17, -0.22]} castShadow>
        <coneGeometry args={[0.08, 0.26, 6]} />
        <meshLambertMaterial color="#E0702B" flatShading />
      </mesh>
      <mesh position={[0.38, GROUND_Y + 0.05, -0.22]}>
        <boxGeometry args={[0.18, 0.02, 0.18]} />
        <meshLambertMaterial color="#E0702B" />
      </mesh>
    </group>
  );
}

function Tree({ position, scale = 1 }: { position: V3; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.08, 0.6, 5]} />
        <meshLambertMaterial color="#7A5A40" flatShading />
      </mesh>
      <mesh position={[0, 0.8, 0]} castShadow>
        <icosahedronGeometry args={[0.42, 0]} />
        <meshLambertMaterial color="#2F9467" flatShading />
      </mesh>
      <mesh position={[0.12, 1.1, 0.05]}>
        <icosahedronGeometry args={[0.26, 0]} />
        <meshLambertMaterial color="#4CC9A0" flatShading />
      </mesh>
    </group>
  );
}

function Baobab({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.32, 1.0, 7]} />
        <meshLambertMaterial color="#9C7B5E" flatShading />
      </mesh>
      {[0, 2.1, 4.2].map((r) => (
        <mesh
          key={r}
          position={[Math.cos(r) * 0.22, 1.08, Math.sin(r) * 0.22]}
          rotation={[Math.sin(r) * 0.6, 0, -Math.cos(r) * 0.6]}
        >
          <cylinderGeometry args={[0.04, 0.08, 0.4, 5]} />
          <meshLambertMaterial color="#9C7B5E" flatShading />
        </mesh>
      ))}
      <mesh position={[0, 1.32, 0]} scale={[1, 0.42, 1]} castShadow>
        <icosahedronGeometry args={[0.72, 0]} />
        <meshLambertMaterial color="#3E9B6E" flatShading />
      </mesh>
    </group>
  );
}
