import { useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Html, Line, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import coast from '../data/jeju-coast.json'
import { SEASONS, season } from '../lib/season'
import { useAppStore } from '../store/useAppStore'

// 위경도 → 장면 좌표 (제주섬 중심 126.55E, 33.38N). 한라산 근처 핀은 산비탈 높이에 얹는다.
const K = 10
const HALLA = [-0.17, 0.18] // 한라산 정상의 장면 좌표
const CONE_R = 1.25 // 한라산 자락(실제 폭 25km 안팎)
const CONE_H = 1.1
export const toScene = (lng, lat) => {
  const x = (lng - 126.55) * K
  const z = -(lat - 33.38) * K
  const r = Math.hypot(x - HALLA[0], z - HALLA[1])
  const slope = Math.max(0, CONE_H * (1 - r / CONE_R))
  return [x, 0.32 + slope, z]
}

// 핀 색: 푸른 공간(바다 가까이) · 초록 공간(오름·숲 같은 자연) · 그 밖
const SPACE_COLOR = { blue: '#6BB8E0', green: '#6CC08F' }
const spaceColor = (s) => SPACE_COLOR[s.space] || '#F2A65A'

// 밤에는 계절색을 어둡게 섞는다
const NIGHT = '#1d2a3c'
const tone = (hex, night) => (night ? `#${new THREE.Color(hex).lerp(new THREE.Color(NIGHT), 0.62).getHexString()}` : hex)

// 실제 해안선(OpenStreetMap) 윤곽을 위경도 → 장면 좌표로 옮겨 땅 모양을 만든다
const LAND_H = 0.3
const landShapes = coast.rings.map((ring) => {
  const shape = new THREE.Shape()
  ring.forEach(([lng, lat], i) => {
    const x = (lng - 126.55) * K
    const y = (lat - 33.38) * K // 눕히면 장면의 z = -y 가 된다
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  })
  return shape
})

function Island({ land, mount }) {
  const geos = useMemo(
    () => landShapes.map((s) => new THREE.ExtrudeGeometry(s, { depth: LAND_H, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 3 })),
    [],
  )
  return (
    <group>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        {geos.map((g, i) => (
          <mesh key={i} geometry={g}>
            <meshStandardMaterial color={land} flatShading />
          </mesh>
        ))}
      </group>
      <mesh position={[HALLA[0], LAND_H + CONE_H / 2, HALLA[1]]}>
        <coneGeometry args={[CONE_R, CONE_H, 40]} />
        <meshStandardMaterial color={mount} flatShading />
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
      ref.current.setColorAt(i, c.set(big ? '#ffffff' : spaceColor(s)))
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

// 하루 동선: 번호 핀과 이어 주는 선
function RoutePath() {
  const stops = useAppStore((s) => s.plan.stops)
  const pts = useMemo(() => stops.map((s) => toScene(s.lng, s.lat)), [stops])
  if (!pts.length) return null
  return (
    <group>
      {pts.length > 1 && <Line points={pts.map(([x, y, z]) => [x, y + 0.12, z])} color="#ffffff" lineWidth={3} dashed dashSize={0.12} gapSize={0.08} />}
      {pts.map(([x, y, z], i) => (
        <Html key={i} position={[x, y + 0.3, z]} center zIndexRange={[5, 0]}>
          <div className={`route-badge ${stops[i].type}`}>{i + 1}</div>
        </Html>
      ))}
    </group>
  )
}

export default function JejuMap3D({ spots, weather }) {
  const selectSpot = useAppStore((s) => s.selectSpot)
  const night = !!weather && !weather.isDay
  const sc = SEASONS[season].scene
  const sky = useMemo(() => tone(SEASONS[season].vars.bg, night), [night])
  const narrow = window.innerWidth < 640 // 세로로 긴 화면에서는 섬 전체가 보이게 뒤로 물러난다

  return (
    <Canvas camera={{ position: narrow ? [0, 9, 12] : [0, 6, 8], fov: 45 }} onPointerMissed={() => selectSpot(null)}>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, 16, 34]} />
      <ambientLight intensity={night ? 0.35 : 0.8} />
      <directionalLight position={[5, 8, 4]} intensity={night ? 0.5 : 1.4} />
      <Sea color={tone(sc.sea, night)} />
      <Island land={tone(sc.land, night)} mount={tone(sc.mount, night)} />
      {spots.length > 0 && <Pins spots={spots} />}
      <RoutePath />
      <OrbitControls enablePan={false} minDistance={3} maxDistance={20} maxPolarAngle={Math.PI / 2.2} />
    </Canvas>
  )
}
