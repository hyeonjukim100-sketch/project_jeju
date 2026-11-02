import { useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useAppStore } from '../store/useAppStore'

// 위경도 → 장면 좌표 (제주섬 중심 126.55E, 33.38N). 한라산 근처 핀은 산비탈 높이에 얹는다.
const K = 10
const HALLA = [-0.17, 0.18] // 한라산 정상의 장면 좌표
const CONE_R = 1.5
const CONE_H = 1.4
export const toScene = (lng, lat) => {
  const x = (lng - 126.55) * K
  const z = -(lat - 33.38) * K
  const r = Math.hypot(x - HALLA[0], z - HALLA[1])
  const slope = Math.max(0, CONE_H * (1 - r / CONE_R))
  return [x, 0.32 + slope, z]
}

const KIND_COLOR = { 자연: '#7ee0a1', 문화: '#ffb454' }
const kindColor = (kind) => KIND_COLOR[kind] || '#5cc8ff'

const SKY = { day: '#bfe3f5', night: '#0b1c2e', cloudy: '#9fb4c4' }

function Island() {
  return (
    <group>
      <mesh scale={[2.9, 1, 1.7]} position={[0, 0.15, 0]}>
        <cylinderGeometry args={[1.6, 1.8, 0.3, 64]} />
        <meshStandardMaterial color="#4f9a64" flatShading />
      </mesh>
      <mesh position={[HALLA[0], 0.3 + CONE_H / 2, HALLA[1]]}>
        <coneGeometry args={[CONE_R, CONE_H, 40]} />
        <meshStandardMaterial color="#6b7f5c" flatShading />
      </mesh>
    </group>
  )
}

function Sea({ color }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[14, 64]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

// 관광지 1천여 곳을 한 번에 그리는 핀 (InstancedMesh)
function Pins({ spots }) {
  const ref = useRef()
  const selected = useAppStore((s) => s.selectedSpot)
  const selectSpot = useAppStore((s) => s.selectSpot)

  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    const c = new THREE.Color()
    spots.forEach((s, i) => {
      const [x, y, z] = toScene(s.lng, s.lat)
      const big = selected?.id === s.id
      m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(...Array(3).fill(big ? 2.4 : 1)))
      ref.current.setMatrixAt(i, m)
      ref.current.setColorAt(i, c.set(big ? '#ffffff' : kindColor(s.kind)))
    })
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.instanceColor.needsUpdate = true
  }, [spots, selected])

  return (
    <instancedMesh
      key={spots.length}
      ref={ref}
      args={[null, null, spots.length]}
      onClick={(e) => {
        e.stopPropagation()
        selectSpot(spots[e.instanceId])
      }}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <sphereGeometry args={[0.045, 12, 12]} />
      <meshBasicMaterial />
    </instancedMesh>
  )
}

export default function JejuMap3D({ spots, weather }) {
  const selectSpot = useAppStore((s) => s.selectSpot)
  const sky = useMemo(() => {
    if (!weather) return SKY.day
    if (!weather.isDay) return SKY.night
    return weather.cloud > 70 ? SKY.cloudy : SKY.day
  }, [weather])
  const night = weather && !weather.isDay

  return (
    <Canvas camera={{ position: [0, 6, 8], fov: 45 }} onPointerMissed={() => selectSpot(null)}>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, 14, 30]} />
      <ambientLight intensity={night ? 0.35 : 0.8} />
      <directionalLight position={[5, 8, 4]} intensity={night ? 0.5 : 1.4} />
      <Sea color={night ? '#0d2238' : '#3b86b8'} />
      <Island />
      {spots.length > 0 && <Pins spots={spots} />}
      <OrbitControls enablePan={false} minDistance={3} maxDistance={16} maxPolarAngle={Math.PI / 2.2} />
    </Canvas>
  )
}
