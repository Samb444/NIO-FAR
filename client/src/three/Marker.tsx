import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group, Mesh, MeshBasicMaterial } from 'three';

/** Marqueur de position lumineux qui pulse (onde au sol + épingle flottante). */
export function Marker({
  position,
  height,
  color,
  phase = 0,
}: {
  position: [number, number, number];
  height: number;
  color: string;
  phase?: number;
}) {
  const pin = useRef<Group>(null!);
  const ring = useRef<Mesh>(null!);
  const ringMat = useRef<MeshBasicMaterial>(null!);
  const halo = useRef<Mesh>(null!);
  const haloMat = useRef<MeshBasicMaterial>(null!);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase;
    pin.current.position.y = height + Math.sin(t * 2) * 0.07;
    pin.current.rotation.y = t * 0.8;
    const k = (t * 0.55) % 1;
    ring.current.scale.setScalar(1 + k * 2.6);
    ringMat.current.opacity = 0.95 * (1 - k);
    const h = 1 + Math.sin(t * 3.5) * 0.18;
    halo.current.scale.setScalar(h);
    haloMat.current.opacity = 0.18 + (h - 0.82) * 0.25;
  });

  return (
    <group position={position}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.16, 0.23, 24]} />
        <meshBasicMaterial ref={ringMat} color={color} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.012, 0.012, height, 5]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} depthWrite={false} toneMapped={false} />
      </mesh>
      <group ref={pin}>
        <mesh ref={halo}>
          <sphereGeometry args={[0.32, 12, 8]} />
          <meshBasicMaterial ref={haloMat} color={color} transparent opacity={0.2} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.17, 14, 10]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.2, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.125, 0.28, 10]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, 0.13]}>
          <circleGeometry args={[0.065, 12]} />
          <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, -0.13]} rotation={[0, Math.PI, 0]}>
          <circleGeometry args={[0.065, 12]} />
          <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
