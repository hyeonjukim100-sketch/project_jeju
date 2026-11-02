import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useAppStore } from '../store/useAppStore'

// 위경도 → 장면 좌표 (제주섬 중심 126.55E, 33.38N)
const K = 10
export const toScene = (lng, lat) => [(lng - 126.55) * K, 0.55, -(lat - 33.38) * K]

// STEP 1 임시 핀 — 이후 TourAPI 결과로 교체
const SAMPLE_SPOTS = [
  { id: 'hallasan', title: '한라산', lng: 126.533, lat: 33.362, color: '#7ee0a1' },
  { id: 'seongsan', title: '성산일출봉', lng: 126.94, lat: 33.458, color: '#ffb454' },
  { id: 'hyeopjae', title: '협재해변', lng: 126.239, lat: 33.394, color: '#5cc8ff' },
]

function Island() {
  return (
    <group>
      <mesh scale={[2.2, 1, 1]} position={[0, 0.15, 0]}>
        <cylinderGeometry args={[1.6, 1.9, 0.3, 64]} />
        <meshStandardMaterial color="#4f9a64" flatShading />
      </mesh>
      <mesh position={[-0.2, 0.75, 0.1]}>
        <coneGeometry args={[0.75, 1.1, 32]} />
        <meshStandardMaterial color="#6b7f5c" flatShading />
      </mesh>
    </group>
  )
}

function Sea() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <circleGeometry args={[14, 64]} />
      <meshStandardMaterial color="#12324f" />
    </mesh>
  )
}

function Pin({ spot }) {
  const selected = useAppStore((s) => s.selectedSpot?.id === spot.id)
  const selectSpot = useAppStore((s) => s.selectSpot)
  return (
    <mesh
      position={toScene(spot.lng, spot.lat)}
      scale={selected ? 1.6 : 1}
      onClick={(e) => {
        e.stopPropagation()
        selectSpot(spot)
      }}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <sphereGeometry args={[0.12, 20, 20]} />
      <meshStandardMaterial color={spot.color} emissive={spot.color} emissiveIntensity={selected ? 0.9 : 0.35} />
    </mesh>
  )
}

export default function JejuMap3D() {
  const selectSpot = useAppStore((s) => s.selectSpot)
  return (
    <Canvas camera={{ position: [0, 6, 8], fov: 45 }} onPointerMissed={() => selectSpot(null)}>
      <color attach="background" args={['#0b1c2e']} />
      <fog attach="fog" args={['#0b1c2e', 14, 30]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 4]} intensity={1.4} />
      <Sea />
      <Island />
      {SAMPLE_SPOTS.map((s) => (
        <Pin key={s.id} spot={s} />
      ))}
      <OrbitControls enablePan={false} minDistance={4} maxDistance={16} maxPolarAngle={Math.PI / 2.2} />
    </Canvas>
  )
}
