import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, Line, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import coast from '../data/jeju-coast.json'
import { SEASONS, season } from '../lib/season'
import { KIND_EMOJI, KIND_GROUP } from '../lib/moods'
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

// 핀: 하얀 동그라미 안에 장소 종류 이모지. 종류마다 한 번에 그린다 (Points, 천여 곳도 가볍다)
const pinKey = (s) => (KIND_EMOJI[KIND_GROUP[s.kind]] ? KIND_GROUP[s.kind] : KIND_EMOJI[s.kind] ? s.kind : '기타')

function pinTexture(emoji, ring, onReady) {
  const img = new Image()
  img.onload = () => {
    const c = document.createElement('canvas')
    c.width = c.height = 192
    const g = c.getContext('2d')
    g.beginPath()
    g.arc(96, 96, 86, 0, Math.PI * 2)
    g.fillStyle = '#ffffff'
    g.fill()
    g.lineWidth = 12
    g.strokeStyle = ring
    g.stroke()
    g.drawImage(img, 38, 38, 116, 116)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    onReady(t)
  }
  img.src = `/emoji/${emoji}.png`
}

// 동그라미 선 색: 이모지 색에 맞춘다
const RING = { 자연: '#4FA765', 오름: '#A0694A', 트레일: '#D08A3E', 문화: '#7C8DB0', 예술: '#E4799C', 시장: '#E9A23B', 올레코스: '#8A8F99', 기타: '#F2A65A' }

function PinLayer({ name, spots, size = 1, ring = RING[name] || '#F2A65A', onPick, lift = 0, top = false }) {
  const [tex, setTex] = useState(null)
  useEffect(() => {
    let dead = false
    pinTexture(KIND_EMOJI[name] || 'pin', ring, (t) => !dead && setTex(t))
    return () => {
      dead = true
    }
  }, [name, ring])
  // 핀 크기는 화면 픽셀 기준: 멀리선 작게(겹침 줄이기), 가까이선 크게(선명하게)
  const mat = useRef()
  useFrame(({ camera }) => {
    if (mat.current) mat.current.size = size * THREE.MathUtils.clamp(120 / camera.position.length(), 11, 40)
  })
  const pos = useMemo(() => new Float32Array(spots.flatMap((s) => { const [x, y, z] = toScene(s.lng, s.lat); return [x, y + 0.08 + lift, z] })), [spots, lift])
  if (!tex) return null
  return (
    <points
      key={spots.length}
      renderOrder={top ? 10 : 1}
      onClick={
        onPick &&
        ((e) => {
          e.stopPropagation()
          onPick(spots[e.index])
        })
      }
      onPointerOver={onPick && (() => (document.body.style.cursor = 'pointer'))}
      onPointerOut={onPick && (() => (document.body.style.cursor = ''))}
    >
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
      </bufferGeometry>
      <pointsMaterial ref={mat} map={tex} size={size} sizeAttenuation={false} transparent alphaTest={0.4} depthTest={!top} />
    </points>
  )
}

function Pins({ spots }) {
  const selected = useAppStore((s) => s.selectedSpot)
  const selectSpot = useAppStore((s) => s.selectSpot)
  const groups = useMemo(() => {
    const m = {}
    for (const s of spots) (m[pinKey(s)] ||= []).push(s)
    return Object.entries(m)
  }, [spots])
  return (
    <group>
      {groups.map(([name, list]) => (
        <PinLayer key={name} name={name} spots={list} onPick={selectSpot} />
      ))}
      {selected && <PinLayer name={pinKey(selected)} spots={[selected]} size={1.55} ring="#ff7a6b" lift={0.1} top />}
    </group>
  )
}

// 계절 추천: 추천 목록의 번호와 같은 번호 핀 (계절 추천 탭을 보고 있을 때만)
function SeasonPins() {
  const tab = useAppStore((s) => s.panelTab)
  const name = useAppStore((s) => s.seasonName)
  const picks = useAppStore((s) => (s.seasonName ? s.seasonPicks[s.seasonName] : null))
  if (tab !== 'season' || !name || !picks) return null
  return (
    <group>
      {picks.map((p, i) => {
        const [x, y, z] = toScene(p.lng, p.lat)
        return (
          <Html key={p.id} position={[x, y + 0.3, z]} center zIndexRange={[5, 0]}>
            <div className="route-badge season">{i + 1}</div>
          </Html>
        )
      })}
    </group>
  )
}

// 하루 동선: 번호 핀과 이어 주는 선
function RoutePath() {
  // 추천 동선을 보고 있을 때는 추천을, 아니면 내 동선을 지도에 그린다
  const stops = useAppStore((s) => (s.panelTab === 'plan' && s.planView === 'rec' ? s.recPlan.stops : s.plan.stops))
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
    <Canvas camera={{ position: narrow ? [0, 9, 12] : [0, 6, 8], fov: 45 }} raycaster={{ params: { Points: { threshold: 0.07 } } }} onPointerMissed={() => selectSpot(null)}>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, 16, 34]} />
      <ambientLight intensity={night ? 0.35 : 0.8} />
      <directionalLight position={[5, 8, 4]} intensity={night ? 0.5 : 1.4} />
      <Sea color={tone(sc.sea, night)} />
      <Island land={tone(sc.land, night)} mount={tone(sc.mount, night)} />
      {spots.length > 0 && <Pins spots={spots} />}
      <RoutePath />
      <SeasonPins />
      <OrbitControls enablePan={false} minDistance={1.2} maxDistance={20} maxPolarAngle={Math.PI / 2.2} />
    </Canvas>
  )
}
