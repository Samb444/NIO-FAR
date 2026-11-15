import { categoryColors } from '../lib/tokens';
import { Marker } from './Marker';

/**
 * Quartier low-poly (≈ 2 500 triangles au total) : maisons à toit plat et à
 * toit de tôle, route, lampadaire, bac à déchets, flaque, nid-de-poule, arbres.
 * Toutes les coordonnées sont exprimées dans le repère de la route (axe X).
 */

const GROUND_Y = 0.25;

type V3 = [number, number, number];

export function Neighborhood({ dark }: { dark: boolean }) {
  return (
    <group position={[0, -0.2, 0]}>
      <Island dark={dark} />
      <group rotation={[0, 0.35, 0]}>
        <Road />
        {/* Rangée nord */}
        <House position={[-1.65, GROUND_Y, -1.25]} body="#F6F1E7" roof="#E0A21B" dark={dark} />
        <FlatHouse position={[-0.35, GROUND_Y, -1.3]} body="#F3D9A4" trim="#0B6B4F" dark={dark} tall />
        <House position={[1.05, GROUND_Y, -1.25]} body="#E8B4A0" roof="#8A9A93" dark={dark} />
        {/* Rangée sud */}
        <FlatHouse position={[-1.2, GROUND_Y, 1.4]} rotation={Math.PI} body="#CDEBDD" trim="#C8553D" dark={dark} />
        <House position={[0.85, GROUND_Y, 1.42]} rotation={Math.PI} body="#FAF7F0" roof="#C8553D" dark={dark} />

        <Lamppost position={[1.95, GROUND_Y, 0.72]} dark={dark} />
        <TrashBin position={[-2.2, GROUND_Y, 0.78]} />
        <Puddle position={[-0.18, GROUND_Y, 1.12]} />
        <Pothole position={[0.55, 0, 0.12]} />

        <Baobab position={[2.15, GROUND_Y, -1.2]} />
        <Tree position={[-2.35, GROUND_Y, -0.55]} scale={0.9} />
        <Tree position={[-0.75, GROUND_Y, -2.25]} scale={0.75} />
        <Tree position={[0.25, GROUND_Y, 2.3]} scale={0.8} />
        <Tree position={[2.35, GROUND_Y, 1.55]} scale={0.65} />

        {/* Marqueurs de signalement */}
        <Marker position={[-2.2, GROUND_Y, 0.78]} height={1.2} color={categoryColors.dechets} phase={0} />
        <Marker position={[-0.18, GROUND_Y, 1.12]} height={0.95} color={categoryColors.eau_stagnante} phase={0.9} />
        <Marker position={[1.95, GROUND_Y, 0.72]} height={2.05} color={categoryColors.eclairage} phase={1.7} />
        <Marker position={[0.55, GROUND_Y, 0.12]} height={1.0} color={categoryColors.voirie} phase={2.4} />
      </group>
    </group>
  );
}

function Island({ dark }: { dark: boolean }) {
  return (
    <group>
      {/* Bordure de sable */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[3.3, 3.1, 0.3, 10]} />
        <meshLambertMaterial color={dark ? '#C9B98F' : '#EAD9B0'} flatShading />
      </mesh>
      {/* Pelouse */}
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[3.08, 3.08, 0.18, 10]} />
        <meshLambertMaterial color={dark ? '#2E7D5B' : '#6CC495'} flatShading />
      </mesh>
      {/* Socle rocheux */}
      <mesh position={[0, -1.35, 0]} rotation={[Math.PI, 0.3, 0]}>
        <coneGeometry args={[3.15, 2.5, 10]} />
        <meshLambertMaterial color={dark ? '#6E4C35' : '#A8724A'} flatShading />
      </mesh>
      <mesh position={[0, -0.35, 0]}>
        <cylinderGeometry args={[3.12, 3.0, 0.5, 10]} />
        <meshLambertMaterial color={dark ? '#7E5A3E' : '#B98257'} flatShading />
      </mesh>
      {/* Rochers suspendus */}
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
      <mesh position={[0, y, 0]}>
        <boxGeometry args={[5.9, 0.04, 0.95]} />
        <meshLambertMaterial color="#3A4741" />
      </mesh>
      {/* Trottoirs */}
      <mesh position={[0, y - 0.005, 0.55]}>
        <boxGeometry args={[5.7, 0.05, 0.14]} />
        <meshLambertMaterial color="#D8CDB4" />
      </mesh>
      <mesh position={[0, y - 0.005, -0.55]}>
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
          {dark ? (
            <meshBasicMaterial color="#FFD27A" toneMapped={false} />
          ) : (
            <meshLambertMaterial color="#9CCFE0" />
          )}
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
      <mesh position={[0, 0.36, 0]}>
        <boxGeometry args={[0.9, 0.72, 0.8]} />
        <meshLambertMaterial color={body} flatShading />
      </mesh>
      <mesh position={[0, 0.97, 0]} rotation={[0, Math.PI / 4, 0]}>
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
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[1.0, h, 0.85]} />
        <meshLambertMaterial color={body} flatShading />
      </mesh>
      {/* Acrotère (toit-terrasse) */}
      <mesh position={[0, h + 0.04, 0]}>
        <boxGeometry args={[1.06, 0.08, 0.91]} />
        <meshLambertMaterial color={trim} flatShading />
      </mesh>
      {/* Cage d'escalier sur le toit */}
      <mesh position={[0.28, h + 0.2, -0.18]}>
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
  return (
    <group position={position} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0, 0.72, 0]}>
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
        <sphereGeometry args={[0.055, 8, 6]} />
        <meshBasicMaterial color={dark ? '#FFD27A' : '#FFF3D1'} toneMapped={false} />
      </mesh>
      {dark && <pointLight position={[-0.4, 1.2, 0]} color="#FFC560" intensity={7} distance={3.5} decay={2} />}
    </group>
  );
}

function TrashBin({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[0.36, 0.44, 0.3]} />
        <meshLambertMaterial color="#0B6B4F" flatShading />
      </mesh>
      <mesh position={[-0.02, 0.48, 0]} rotation={[0, 0, 0.25]}>
        <boxGeometry args={[0.4, 0.05, 0.34]} />
        <meshLambertMaterial color="#08523D" flatShading />
      </mesh>
      {/* Sacs débordants */}
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
      {/* Cône de signalisation */}
      <mesh position={[0.38, GROUND_Y + 0.17, -0.22]}>
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
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.05, 0.08, 0.6, 5]} />
        <meshLambertMaterial color="#7A5A40" flatShading />
      </mesh>
      <mesh position={[0, 0.8, 0]}>
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
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.2, 0.32, 1.0, 7]} />
        <meshLambertMaterial color="#9C7B5E" flatShading />
      </mesh>
      {[0, 2.1, 4.2].map((r) => (
        <mesh key={r} position={[Math.cos(r) * 0.22, 1.08, Math.sin(r) * 0.22]} rotation={[Math.sin(r) * 0.6, 0, -Math.cos(r) * 0.6]}>
          <cylinderGeometry args={[0.04, 0.08, 0.4, 5]} />
          <meshLambertMaterial color="#9C7B5E" flatShading />
        </mesh>
      ))}
      <mesh position={[0, 1.32, 0]} scale={[1, 0.42, 1]}>
        <icosahedronGeometry args={[0.72, 0]} />
        <meshLambertMaterial color="#3E9B6E" flatShading />
      </mesh>
    </group>
  );
}
