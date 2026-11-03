import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { KIND_EMOJI, KIND_GROUP } from '../lib/moods'
import { useAppStore } from '../store/useAppStore'
import { distForZoom } from './JejuMap3D'

// 세부 지도: 3D 를 충분히 확대하면 나타나는 실제 지도(OpenStreetMap). 도로·지명이 보여 위치를 알 수 있다.
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const BOUNDS = [[33.0, 126.0], [33.7, 127.1]]
const MIN_ZOOM = 11 // 이보다 멀어지면 다시 3D 로 돌아간다
const RING = { 자연: '#4FA765', 오름: '#A0694A', 트레일: '#D08A3E', 문화: '#7C8DB0', 예술: '#E4799C', 시장: '#E9A23B', 올레코스: '#8A8F99', 기타: '#F2A65A' }
const pinKey = (s) => (KIND_EMOJI[KIND_GROUP[s.kind]] ? KIND_GROUP[s.kind] : KIND_EMOJI[s.kind] ? s.kind : '기타')
const MAX_PINS = 500

const pinIcon = (s, selected) => {
  const key = pinKey(s)
  const size = selected ? 46 : 34
  return L.divIcon({
    className: 'dm-pin-wrap',
    html: `<div class="dm-pin ${selected ? 'sel' : ''}" style="border-color:${selected ? '#ff7a6b' : RING[key] || '#F2A65A'}"><img src="/emoji/${KIND_EMOJI[key] || 'pin'}.png" alt="" draggable="false"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}
const badgeIcon = (n, cls) => L.divIcon({ className: 'dm-pin-wrap', html: `<div class="route-badge ${cls}">${n}</div>`, iconSize: [28, 28], iconAnchor: [14, 14] })

export default function DetailMap({ spots }) {
  const box = useRef()
  const map = useRef()
  const layer = useRef()
  const draw = useRef(() => {})
  const detail = useRef(useAppStore.getState().detail) // 처음 켜질 때의 위치·확대만 쓴다
  const selected = useAppStore((s) => s.selectedSpot)
  const focus = useAppStore((s) => s.focus)
  const selectSpot = useAppStore((s) => s.selectSpot)
  const tab = useAppStore((s) => s.panelTab)
  const planView = useAppStore((s) => s.planView)
  const stops = useAppStore((s) => (s.panelTab === 'plan' && s.planView === 'rec' ? s.recPlan.stops : s.plan.stops))
  const seasonName = useAppStore((s) => s.seasonName)
  const picks = useAppStore((s) => (s.seasonName ? s.seasonPicks[s.seasonName] : null))

  const exit = () => {
    const m = map.current
    const c = m.getCenter()
    const h = box.current.clientHeight
    useAppStore.getState().exitDetail({ lat: c.lat, lng: c.lng, dist: Math.min(14, Math.max(2.6, distForZoom(m.getZoom(), c.lat, h))), instant: true })
  }
  const exitRef = useRef(exit)
  exitRef.current = exit

  // 왼쪽 패널이 가리는 만큼 지도 중심을 오른쪽으로 보이게 옮긴다 (넓은 화면에서만)
  const shifted = (m, ll, z) => {
    const off = window.innerWidth >= 768 ? 366 : 0
    if (!off) return ll
    const p = m.project(ll, z)
    return m.unproject(L.point(p.x - off / 2, p.y), z)
  }

  useEffect(() => {
    const m = L.map(box.current, { zoomControl: false, zoomSnap: 0.25, minZoom: 10, maxZoom: 18, maxBounds: L.latLngBounds(BOUNDS).pad(0.1) })
    L.tileLayer(TILES, { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> 참여자' }).addTo(m)
    L.control.zoom({ position: 'bottomright', zoomInTitle: '확대', zoomOutTitle: '축소' }).addTo(m)
    const d = detail.current
    m.setView(d.shift ? shifted(m, L.latLng(d.lat, d.lng), d.zoom) : L.latLng(d.lat, d.lng), d.zoom, { animate: false })
    m.on('click', () => selectSpot(null))
    layer.current = L.layerGroup().addTo(m)
    const sizeClass = () => box.current.classList.toggle('dm-far', m.getZoom() < 13.5) // 멀리서는 핀을 작게
    sizeClass()
    m.on('zoomend', () => {
      sizeClass()
      if (m.getZoom() < MIN_ZOOM) exitRef.current()
    })
    m.on('moveend', () => draw.current())
    map.current = m
    // 모바일에서 아래 시트를 끌어 지도 높이가 바뀌면 타일이 어긋나지 않게 다시 맞춘다
    let raf = 0
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => m.invalidateSize({ pan: false }))
    })
    ro?.observe(box.current)
    return () => {
      cancelAnimationFrame(raf)
      ro?.disconnect()
      m.remove()
    }
  }, [])

  // 핀·동선·계절 번호 그리기
  draw.current = () => {
    const m = map.current
    if (!m) return
    const g = layer.current
    g.clearLayers()
    const area = m.getBounds().pad(0.15)
    let n = 0
    for (const s of spots) {
      if (selected || s.lat == null || !area.contains([s.lat, s.lng])) continue
      if (++n > MAX_PINS) break
      L.marker([s.lat, s.lng], { icon: pinIcon(s, false), title: s.title, riseOnHover: true }).on('click', () => selectSpot(s)).addTo(g)
    }
    if (tab === 'plan' && stops.length) {
      const pts = stops.map((s) => [s.lat, s.lng])
      if (pts.length > 1) L.polyline(pts, { color: '#ff7a6b', weight: 4, opacity: 0.9, dashArray: '9 8' }).addTo(g)
      stops.forEach((s, i) => L.marker(pts[i], { icon: badgeIcon(i + 1, s.type), zIndexOffset: 500, title: s.title }).addTo(g))
    }
    if (tab === 'season' && seasonName && picks) picks.forEach((p, i) => L.marker([p.lat, p.lng], { icon: badgeIcon(i + 1, 'season'), zIndexOffset: 500, title: p.title }).addTo(g))
    if (selected?.lat != null) {
      L.marker([selected.lat, selected.lng], { icon: pinIcon(selected, true), zIndexOffset: 1000, title: selected.title })
        .bindTooltip(selected.title, { permanent: true, direction: 'top', offset: [0, -26], className: 'dm-tip' })
        .addTo(g)
    }
  }
  useEffect(() => draw.current(), [spots, selected, stops, tab, planView, seasonName, picks])

  // 장소를 고르면 그 핀으로 이동
  useEffect(() => {
    const m = map.current
    if (!m || !focus || focus.instant) return
    const z = Math.max(m.getZoom(), 15)
    m.flyTo(shifted(m, L.latLng(focus.lat, focus.lng), z), z, { duration: 0.9 })
  }, [focus])

  return (
    <div className="detail-map">
      <div ref={box} className="detail-map-box" />
      <button type="button" className="map-switch" onClick={exit}>
        <i className="bi bi-badge-3d" /> 3D로 보기
      </button>
    </div>
  )
}
