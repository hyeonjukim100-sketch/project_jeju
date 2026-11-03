import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, Line, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import dem from '../data/jeju-dem.json'
import { SEASONS, season } from '../lib/season'
import { mapWeather } from '../lib/mapWeather'
import { KIND_EMOJI, KIND_GROUP } from '../lib/moods'
import { useAppStore } from '../store/useAppStore'
import DetailMap from './DetailMap'

// 지형: 공개 고도 자료(DEM, AWS Terrain Tiles/SRTM)를 격자로 줄여 두었다. 땅 높이는 이 고도를 그대로 따른다.
// 위경도 → 장면 좌표 (제주섬 중심 126.55E, 33.38N). 위도 33도에서는 경도 1도가 위도 1도의 83% 길이라 가로를 그만큼 줄인다.
const K = 10
const XS = Math.cos((33.38 * Math.PI) / 180)
const BASE = 0.1 // 해안 땅 높이
const EXAG = 0.00044 // 고도 1m 당 장면 높이 (실제의 약 5배로 과장)
const SEA_Y = -0.25 // 바다 쪽 격자 점은 바닷물 아래로 내려 해안선을 만든다

const demAt = (c, r) => dem.data[Math.min(dem.rows - 1, Math.max(0, r)) * dem.cols + Math.min(dem.cols - 1, Math.max(0, c))]
const elevAt = (lng, lat) => {
  const c = (lng - dem.lng0) / dem.dLng
  const r = (dem.lat1 - lat) / dem.dLat
  const c0 = Math.floor(c), r0 = Math.floor(r), fc = c - c0, fr = r - r0
  return demAt(c0, r0) * (1 - fc) * (1 - fr) + demAt(c0 + 1, r0) * fc * (1 - fr) + demAt(c0, r0 + 1) * (1 - fc) * fr + demAt(c0 + 1, r0 + 1) * fc * fr
}
export const toScene = (lng, lat) => {
  const e = elevAt(lng, lat)
  return [(lng - 126.55) * K * XS, BASE + (e > 0 ? e * EXAG : 0) + 0.04, -(lat - 33.38) * K]
}
export const fromScene = (x, z) => ({ lng: x / (K * XS) + 126.55, lat: 33.38 - z / K })

// 3D 카메라 거리 ↔ 세부 지도(타일 지도) 확대 단계. 장면 1칸 = 위도 0.1도 ≈ 11.12km, 타일 지도는 확대 0에서 화면 한 점이 156543m×cos(위도).
const FOV = 45
const M_PER_UNIT = 11119.5
const TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2))
export const zoomForDist = (d, lat, h) => Math.log2((156543.03 * Math.cos((lat * Math.PI) / 180) * h) / (2 * d * TAN * M_PER_UNIT))
export const distForZoom = (z, lat, h) => ((156543.03 * Math.cos((lat * Math.PI) / 180)) / 2 ** z * h) / (2 * TAN * M_PER_UNIT)
const DETAIL_D = 1.9 // 이 거리보다 가까워지면 세부 지도로 바뀐다

// 땅(1)/바다(0) 마스크를 상자 평균으로 흐려서, 해안선이 칸 모양 계단이 아니라 부드러운 곡선이 되게 한다
const blur = (src, rad) => {
  const { cols, rows } = dem
  let a = src
  for (let pass = 0; pass < 2; pass++) {
    const b = new Float32Array(a.length)
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
      let sum = 0, n = 0
      for (let d = -rad; d <= rad; d++) {
        const v = pass === 0 ? q + d : r + d
        if (v < 0 || v >= (pass === 0 ? cols : rows)) continue
        sum += a[pass === 0 ? r * cols + v : v * cols + q]; n++
      }
      b[r * cols + q] = sum / n
    }
    a = b
  }
  return a
}
const landMask = Float32Array.from(dem.data, (e) => (e > 0 ? 1 : 0))
const coastM = blur(landMask, 1)
const shelfM = blur(landMask, 4)
const gx = (c) => (dem.lng0 + c * dem.dLng - 126.55) * K * XS
const gz = (r) => -(dem.lat1 - r * dem.dLat - 33.38) * K

// 해가 진 뒤: 계절과 상관없이 남색 하늘에 청록 섬 (해질녘 글로우)
const DUSK = { sky: '#262B58', sea: '#2A4377', land: '#7FB8A6', mount: '#A4D2B8', shallow: '#4F86B8', wash: ['#9CCBB4', '#7DA6C8', '#B4DCC0'] }
// 낮: 계절 색 위에 번지는 수채화 얼룩 색
const WASH_DAY = ['#E4EDA8', '#B8E6B0', '#A8DCC4']
// 낮 땅은 계절 색을 초록쪽으로 끌어당긴다
const greener = (hex, to, t) => `#${new THREE.Color(hex).lerp(new THREE.Color(to), t).getHexString()}`
// 부드럽게 이어지는 값 잡음 (0~1). 격자 좌표에 사인을 겹쳐 수채 물감이 번진 듯한 얼룩을 만든다
const blotch = (x, z, s) => 0.5 + 0.25 * Math.sin(x * s + 1.3 * Math.sin(z * s * 0.7)) + 0.25 * Math.sin(z * s * 1.1 - 1.7 * Math.sin(x * s * 0.6 + 2))
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }

// 점토 느낌: 아주 약한 얼룩(범프) 무늬
function useClayBump() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const g = c.getContext('2d')
    const d = g.createImageData(256, 256)
    for (let i = 0; i < d.data.length; i += 4) {
      const v = 122 + Math.random() * 10
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v
      d.data[i + 3] = 255
    }
    g.putImageData(d, 0, 0)
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(26, 18)
    return t
  }, [])
}

// 고도 격자 → 점토 지형 (해안은 낮은 땅, 한라산은 높은 흙색)
function useTerrain(land, mount, wash) {
  return useMemo(() => {
    const washes = wash.map((h) => new THREE.Color(h))
    const { cols, rows } = dem
    const pos = new Float32Array(cols * rows * 3)
    const col = new Float32Array(cols * rows * 3)
    const uv = new Float32Array(cols * rows * 2)
    const cLand = new THREE.Color(land), cMount = new THREE.Color(mount)
    const cRock = new THREE.Color(mount).multiplyScalar(0.72), cSand = new THREE.Color(land).lerp(new THREE.Color('#fff4d6'), 0.55)
    const c = new THREE.Color()
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
      const i = r * cols + q, e = dem.data[i]
      const top = BASE + Math.max(e, 0) * EXAG
      pos.set([gx(q), SEA_Y + (top - SEA_Y) * sstep(0.2, 0.62, coastM[i]), gz(r)], i * 3)
      uv.set([q / (cols - 1), r / (rows - 1)], i * 2)
      const x = gx(q), z = gz(r)
      c.copy(cLand)
      washes.forEach((w, k) => c.lerp(w, sstep(0.5, 0.8, blotch(x + k * 3.1, z - k * 2.3, 1.1 + k * 0.55)) * 0.7))
      c.lerp(cMount, sstep(80, 700, e)).lerp(cRock, sstep(1250, 1800, e) * 0.8).lerp(cSand, 1 - sstep(0, 14, e))
      c.multiplyScalar(0.92 + 0.14 * blotch(x * 1.7, z * 1.7, 5.5)) // 물감이 고인 듯 진하고 옅은 얼룩
      col.set([c.r, c.g, c.b], i * 3)
    }
    const idx = []
    for (let r = 0; r < rows - 1; r++) for (let q = 0; q < cols - 1; q++) {
      const a = r * cols + q, b = a + 1, d = a + cols, e = d + 1
      if (coastM[a] + coastM[b] + coastM[d] + coastM[e] === 0) continue
      idx.push(a, d, b, b, d, e)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }, [land, mount, wash])
}

// 섬 둘레 얕은 바다 띠: 흐린 마스크가 0.3 인 곳이 바닷물 높이와 만나서 부드러운 띠 가장자리가 된다
const shelfGeo = (() => {
  const { cols, rows } = dem
  const pos = new Float32Array(cols * rows * 3)
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) pos.set([gx(q), (shelfM[r * cols + q] - 0.12) * 0.1, gz(r)], (r * cols + q) * 3)
  const idx = []
  for (let r = 0; r < rows - 1; r++) for (let q = 0; q < cols - 1; q++) {
    const a = r * cols + q, b = a + 1, d = a + cols, e = d + 1
    if (shelfM[a] + shelfM[b] + shelfM[d] + shelfM[e] > 0.05) idx.push(a, d, b, b, d, e)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
})()

function Island({ land, mount, shallow, wash }) {
  const bump = useClayBump()
  const terrain = useTerrain(land, mount, wash)
  return (
    <group>
      <mesh geometry={shelfGeo}>
        <meshStandardMaterial color={shallow} roughness={1} transparent opacity={0.8} />
      </mesh>
      <mesh geometry={terrain}>
        <meshStandardMaterial vertexColors roughness={0.95} bumpMap={bump} bumpScale={0.25} />
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

function pinTexture(emoji, ring, onReady, night) {
  const img = new Image()
  img.onload = () => {
    const c = document.createElement('canvas')
    c.width = c.height = 192
    const g = c.getContext('2d')
    if (night) {
      // 밤: 노란 불빛이 번지는 핀
      const glow = g.createRadialGradient(96, 96, 56, 96, 96, 96)
      glow.addColorStop(0, 'rgba(243,199,107,0.95)')
      glow.addColorStop(1, 'rgba(243,199,107,0)')
      g.fillStyle = glow
      g.fillRect(0, 0, 192, 192)
    }
    const r = night ? 66 : 86
    g.beginPath()
    g.arc(96, 96, r, 0, Math.PI * 2)
    g.fillStyle = night ? '#fff8e0' : '#ffffff'
    g.fill()
    g.lineWidth = 12
    g.strokeStyle = night ? '#F3C76B' : ring
    g.stroke()
    const s = night ? 90 : 116
    g.drawImage(img, 96 - s / 2, 96 - s / 2, s, s)
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
  const night = useAppStore((s) => !!s.weather && !s.weather.isDay) && !top // 고른 핀은 밤에도 눈에 띄는 색 그대로
  useEffect(() => {
    let dead = false
    pinTexture(KIND_EMOJI[name] || 'pin', ring, (t) => !dead && setTex(t), night)
    return () => {
      dead = true
    }
  }, [name, ring, night])
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
      {!selected && groups.map(([name, list]) => ( // 장소를 고르면 그 핀만 보인다
        <PinLayer key={name} name={name} spots={list} onPick={selectSpot} />
      ))}
      {selected && <PinLayer name={pinKey(selected)} spots={[selected]} size={1.55} ring="#ff7a6b" lift={0.1} top />}
    </group>
  )
}

// 어디가 어딘지 알 수 있게: 시(제주시·서귀포시)와 대표 지명을 지도에 글자로 붙인다. 위치는 대표 지점(시청·산·섬)이다.
const LABELS = [
  { t: '서귀포시', lng: 126.56, lat: 33.25, big: true },
  { t: '제주시', lng: 126.52, lat: 33.53, big: true },
  { t: '한라산', lng: 126.55, lat: 33.335 },
  { t: '성산일출봉', lng: 126.94, lat: 33.458 },
  { t: '우도', lng: 126.95, lat: 33.5 },
  { t: '마라도', lng: 126.27, lat: 33.115 },
  { t: '애월', lng: 126.33, lat: 33.46 },
  { t: '협재', lng: 126.24, lat: 33.394 },
  { t: '중문', lng: 126.41, lat: 33.25 },
  { t: '함덕', lng: 126.67, lat: 33.543 },
]
function MapLabels() {
  return (
    <group>
      {/* 맨 앞 하나는 화면에 그려지지 않는 일이 있어, 보이지 않는 빈 글자를 앞에 하나 둔다 */}
      <Html position={[0, -5, 0]} style={{ pointerEvents: 'none' }}><span /></Html>
      {LABELS.map((l) => {
        const [x, y, z] = toScene(l.lng, l.lat)
        return (
          <Html key={l.t} position={[x, y + 0.35, z]} center zIndexRange={[2, 0]} style={{ pointerEvents: 'none' }}>
            <div className={`map-label ${l.big ? 'big' : ''}`}>{l.t}</div>
          </Html>
        )
      })}
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

// 카메라: 장소를 고르면 그 핀으로 날아가고, 충분히 확대하면 세부 지도로 바꾼다
function CameraRig() {
  const controls = useRef()
  const goal = useRef(null)
  const { camera, size } = useThree()
  const focus = useAppStore((s) => s.focus)
  const detailReq = useAppStore((s) => s.detailReq)

  const enterDetail = () => {
    const t = controls.current.target
    const { lat, lng } = fromScene(t.x, t.z)
    const zoom = Math.round(THREE.MathUtils.clamp(zoomForDist(camera.position.distanceTo(t), lat, size.height), 11.5, 15) * 4) / 4
    useAppStore.getState().setDetail({ lat, lng, zoom })
  }

  useEffect(() => {
    if (!focus || useAppStore.getState().detail) return // 세부 지도를 보는 중이면 그쪽이 움직인다
    const c = controls.current
    const [x, y, z] = toScene(focus.lng, focus.lat)
    const to = new THREE.Vector3(x, y - 0.04, z)
    const dir = camera.position.clone().sub(c.target).normalize()
    if (dir.y < 0.55) { dir.y = 0.55; dir.normalize() } // 너무 눕지 않게
    const dist = focus.dist || 2.2
    const pos = to.clone().addScaledVector(dir, dist)
    if (focus.instant) {
      c.target.copy(to)
      camera.position.copy(pos)
      c.update()
    } else goal.current = { to, pos, detail: { lat: focus.lat, lng: focus.lng } } // 다 날아간 뒤 세부 지도로
  }, [focus])

  // 여러 곳(동선·계절 추천)이 모두 보이게 그 중심으로 옮긴다. 세부 지도로 바뀔 만큼 가까워지지는 않게 멈춘다.
  const fit = useAppStore((s) => s.fit)
  useEffect(() => {
    if (!fit?.points.length || useAppStore.getState().detail) return
    const c = controls.current
    const p = fit.points.map((q) => toScene(q.lng, q.lat))
    const xs = p.map((v) => v[0]), zs = p.map((v) => v[2])
    const to = new THREE.Vector3((Math.min(...xs) + Math.max(...xs)) / 2, p[0][1] - 0.04, (Math.min(...zs) + Math.max(...zs)) / 2)
    const span = Math.max(Math.max(...zs) - Math.min(...zs), (Math.max(...xs) - Math.min(...xs)) * (size.height / size.width))
    const dir = camera.position.clone().sub(c.target).normalize()
    if (dir.y < 0.55) { dir.y = 0.55; dir.normalize() }
    const dist = THREE.MathUtils.clamp(span * 2 + 1, DETAIL_D + 0.5, 14)
    goal.current = { to, pos: to.clone().addScaledVector(dir, dist) }
  }, [fit])

  useEffect(() => {
    if (!detailReq) return
    enterDetail()
  }, [detailReq])

  useFrame((_, dt) => {
    const c = controls.current
    if (!c) return
    const g = goal.current
    if (g) {
      const k = 1 - Math.exp(-dt * 4.5)
      c.target.lerp(g.to, k)
      camera.position.lerp(g.pos, k)
      if (camera.position.distanceTo(g.pos) < 0.015) {
        goal.current = null
        if (g.detail) useAppStore.getState().setDetail({ ...g.detail, zoom: 16, shift: true })
      }
      return
    }
    // 끌어서 섬 밖으로 나가지 않게
    const t = c.target
    const cx = THREE.MathUtils.clamp(t.x, -4.5, 4.5), cz = THREE.MathUtils.clamp(t.z, -3.5, 3.5)
    if (cx !== t.x || cz !== t.z) { camera.position.x += cx - t.x; camera.position.z += cz - t.z; t.x = cx; t.z = cz }
    if (camera.position.distanceTo(t) < DETAIL_D && !useAppStore.getState().detail) enterDetail()
  })

  return <OrbitControls ref={controls} makeDefault screenSpacePanning={false} zoomToCursor minDistance={1.2} maxDistance={20} maxPolarAngle={Math.PI / 2.2} onStart={() => (goal.current = null)} />
}

// 모바일에서 지도 칸이 낮아지면(아래 목록을 키우면) 섬이 작아 보이지 않게 살짝 확대한다 (칸이 가로로 길수록 조금 더)
function FitZoom() {
  const { camera, size } = useThree()
  const goal = useRef(1)
  goal.current = window.innerWidth < 640 && size.height > 0 ? Math.min(1.3, Math.max(1, 1 + (size.width / size.height - 0.8) * 0.15)) : 1
  useFrame(() => {
    if (Math.abs(camera.zoom - goal.current) < 0.002) return
    camera.zoom += (goal.current - camera.zoom) * 0.15
    camera.updateProjectionMatrix()
  })
  return null
}

// 밤하늘: 지도 위쪽에 연하게 깜빡이는 별. 카메라가 아래를 보고 있어 3D 안에 하늘이 없으므로 화면 위에 얹는다
const STARS = (() => {
  let s = 7
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  return Array.from({ length: 48 }, () => ({ left: rnd() * 100, top: Math.pow(rnd(), 1.7) * 46, size: 1 + rnd() * 1.6, o: 0.3 + rnd() * 0.45, d: rnd() * 4 }))
})()
function Stars() {
  return (
    <div className="night-stars" aria-hidden="true">
      {STARS.map((t, i) => (
        <i key={i} style={{ left: `${t.left}%`, top: `${t.top}%`, width: t.size, height: t.size, opacity: t.o, animationDelay: `${t.d}s` }} />
      ))}
    </div>
  )
}

// 눈송이 모양(동그란 점)
const dotTexture = (() => {
  let t
  return () => {
    if (t) return t
    const c = document.createElement('canvas')
    c.width = c.height = 32
    const g = c.getContext('2d')
    const grad = g.createRadialGradient(16, 16, 2, 16, 16, 15)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 32, 32)
    t = new THREE.CanvasTexture(c)
    return t
  }
})()

// 내리는 것: 장면 위쪽 상자에서 땅으로 떨어지고, 바닥에 닿으면 다시 위에서 시작한다
const BOX = 9
const TOP = 9
const spread = () => (Math.random() * 2 - 1) * BOX

function Rain({ count, color }) {
  const head = useMemo(() => Float32Array.from({ length: count * 3 }, (_, i) => (i % 3 === 1 ? Math.random() * TOP : spread())), [count])
  const line = useMemo(() => new Float32Array(count * 6), [count])
  const geo = useRef()
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05)
    for (let i = 0; i < count; i++) {
      head[i * 3 + 1] -= 11 * d
      head[i * 3] -= 1.2 * d
      if (head[i * 3 + 1] < 0) { head[i * 3] = spread(); head[i * 3 + 1] = TOP; head[i * 3 + 2] = spread() }
      line.set([head[i * 3], head[i * 3 + 1], head[i * 3 + 2], head[i * 3] + 0.1, head[i * 3 + 1] + 0.42, head[i * 3 + 2]], i * 6)
    }
    if (geo.current) geo.current.attributes.position.needsUpdate = true
  })
  return (
    <lineSegments frustumCulled={false} raycast={() => null}>
      <bufferGeometry ref={geo}>
        <bufferAttribute attach="attributes-position" args={[line, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color={color} transparent opacity={0.8} depthWrite={false} fog={false} />
    </lineSegments>
  )
}

function Snow({ count, color }) {
  const pos = useMemo(() => Float32Array.from({ length: count * 3 }, (_, i) => (i % 3 === 1 ? Math.random() * TOP : spread())), [count])
  const geo = useRef()
  useFrame(({ clock }, dt) => {
    const d = Math.min(dt, 0.05), t = clock.elapsedTime
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] -= (0.7 + (i % 5) * 0.12) * d
      pos[i * 3] += Math.sin(t * 0.8 + i) * 0.25 * d
      if (pos[i * 3 + 1] < 0) { pos[i * 3] = spread(); pos[i * 3 + 1] = TOP; pos[i * 3 + 2] = spread() }
    }
    if (geo.current) geo.current.attributes.position.needsUpdate = true
  })
  return (
    <points frustumCulled={false} raycast={() => null}>
      <bufferGeometry ref={geo}>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
      </bufferGeometry>
      <pointsMaterial map={dotTexture()} color={color} size={8} sizeAttenuation={false} transparent opacity={1} depthWrite={false} alphaTest={0.05} fog={false} />
    </points>
  )
}

function Precip({ kind, night, narrow }) {
  const rain = night ? '#9fb4ff' : '#dbe9ff'
  const snow = night ? '#e8eeff' : '#ffffff'
  const n = narrow ? 1 : 1.5
  return (
    <>
      {(kind === 'rain' || kind === 'sleet') && <Rain count={Math.round((kind === 'sleet' ? 200 : 320) * n)} color={rain} />}
      {(kind === 'snow' || kind === 'sleet') && <Snow count={Math.round((kind === 'sleet' ? 160 : 300) * n)} color={snow} />}
    </>
  )
}

// 구름: 섬을 가리지 않게 바다 바깥쪽에 띄운다
function Clouds({ count, color }) {
  const puffs = useMemo(() => Array.from({ length: count }, (_, i) => {
    const a = i * 2.399, r = 7 + (i % 3) * 1.8
    return { x: Math.cos(a) * r, z: Math.sin(a) * r - 1, y: 3.2 + (i % 4) * 0.45, s: 1.1 + (i % 3) * 0.4 }
  }), [count])
  return (
    <group>
      {puffs.map((p, i) => (
        <group key={i} position={[p.x, p.y, p.z]} scale={p.s}>
          {[[0, 0, 0, 1.4], [1.1, -0.1, 0.2, 1], [-1.1, -0.15, -0.1, 1.1]].map(([x, y, z, r], k) => (
            <mesh key={k} position={[x, y, z]} scale={[1.5, 0.55, 1]}>
              <sphereGeometry args={[r * 0.8, 14, 10]} />
              <meshBasicMaterial color={color} transparent opacity={0.55} depthWrite={false} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

export default function JejuMap3D({ spots, weather }) {
  const selectSpot = useAppStore((s) => s.selectSpot)
  const detail = useAppStore((s) => s.detail)
  const requestDetail = useAppStore((s) => s.requestDetail)
  const night = !!weather && !weather.isDay
  const skyKind = weather?.sky
  const wx = mapWeather(skyKind)
  const sc = SEASONS[season].scene
  const pal = useMemo(() => {
    const base = night ? DUSK : { sky: SEASONS[season].vars.bg, sea: sc.sea, land: greener(sc.land, '#8FD07E', 0.9), mount: greener(sc.mount, '#6DAE6E', 0.85), shallow: new THREE.Color(sc.sea).lerp(new THREE.Color('#ffffff'), 0.35).getStyle(), wash: WASH_DAY }
    const g = wx.grey, snowC = night ? '#dfe8ff' : '#ffffff'
    return {
      sky: greener(base.sky, night ? '#1c2040' : '#aeb6bd', night ? g * 0.5 : g),
      sea: greener(base.sea, night ? '#1f2f55' : '#8a98a3', night ? g * 0.4 : g * 0.5),
      land: greener(base.land, snowC, wx.snowCover),
      mount: greener(base.mount, snowC, wx.snowCover * 1.2),
      shallow: base.shallow,
      wash: base.wash.map((h) => greener(h, snowC, wx.snowCover)),
    }
  }, [night, skyKind])
  const sky = pal.sky
  const narrow = window.innerWidth < 640 // 세로로 긴 화면에서는 섬 전체가 보이게 뒤로 물러난다

  return (
    <>
    <Canvas camera={{ position: narrow ? [0, 9, 12] : [0, 6, 8], fov: 45 }} raycaster={{ params: { Points: { threshold: 0.07 } } }} onPointerMissed={() => selectSpot(null)}>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, wx.fogNear, wx.fogFar]} />
      <hemisphereLight args={[sky, night ? '#5a5f9a' : '#d9c9a8', (night ? 1.0 : 0.8) * (0.6 + 0.4 * wx.light)]} />
      <ambientLight intensity={night ? 0.8 : 0.6} />
      <directionalLight position={[5, 8, 4]} color={night ? '#b8c4ff' : '#fff1dc'} intensity={(night ? 0.7 : 1.0) * wx.light} />
      <Sea color={pal.sea} />
      <Island land={pal.land} mount={pal.mount} shallow={pal.shallow} wash={pal.wash} />
      {wx.clouds > 0 && <Clouds count={wx.clouds} color={night ? '#8a93c0' : greener('#ffffff', '#9aa3ab', wx.grey)} />}
      {wx.precip && <Precip kind={wx.precip} night={night} narrow={narrow} />}
      {spots.length > 0 && <Pins spots={spots} />}
      <MapLabels />
      <RoutePath />
      <SeasonPins />
      <CameraRig />
      <FitZoom />
    </Canvas>
    {night && !detail && wx.grey < 0.3 && <Stars />}
    {detail ? (
      <DetailMap spots={spots} />
    ) : (
      <button type="button" className="map-switch" onClick={requestDetail}>
        <i className="bi bi-map" /> 세부 지도
      </button>
    )}
    </>
  )
}
