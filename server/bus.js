// 제주 버스 노선 기본 정보 (제주데이터허브 오픈API, 공공데이터포털 15074254).
// 노선 번호·시종점 정류소·정류소 수·노선 거리만 있고 좌표나 시간표는 없다. 하루 1000회 제한이라 오래 보관해 둔다.
const BASE = 'https://open.jejudatahub.net/api/proxy/aaatD6D1atta1611at1t6a1b6at1b11a'
const TTL = 24 * 60 * 60 * 1000
const PAGE = 100 // 한 번에 최대 100개
let cache = null

export const busKey = () => {
  const k = process.env.JEJU_BUS_KEY
  if (!k) throw new Error('JEJU_BUS_KEY 가 .env.local 에 없어요')
  return k
}

// 정류소 위치·도착 정보: 제주버스정보시스템(bus.jeju.go.kr) 누리집이 화면에서 쓰는 주소. 키는 필요 없지만 공식 공개 API는 아니라 바뀔 수 있다.
const BIS = 'https://bus.jeju.go.kr/data/search'
const arrivalCache = new Map()
const stopCache = new Map()
const ARRIVAL_TTL = 20 * 1000

export async function bisPost(path, params) {
  const r = await fetch(`${BIS}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(8000),
  })
  if (!r.ok) throw new Error(`bus.jeju.go.kr ${r.status}`)
  return r.json()
}

const meters = (aLat, aLng, bLat, bLng) => {
  const rad = Math.PI / 180
  const dLat = (bLat - aLat) * rad
  const dLng = (bLng - aLng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * 6371000 * Math.asin(Math.sqrt(h)))
}

// 좌표 주변(기본 600m) 정류소를 가까운 순서로
export async function getStopsNear(lat, lng, radius = 600) {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)},${radius}`
  const hit = stopCache.get(key)
  if (hit && Date.now() - hit.at < TTL) return hit.stops
  const dLat = radius / 111000
  const dLng = radius / (111000 * Math.cos((lat * Math.PI) / 180))
  const rows = await bisPost('stationListByBounds', {
    southWestLat: lat - dLat,
    southWestLng: lng - dLng,
    northEastLat: lat + dLat,
    northEastLng: lng + dLng,
  })
  const stops = (Array.isArray(rows) ? rows : [])
    .map((s) => ({ id: s.stationId, name: s.stationNm, lat: s.localY, lng: s.localX, meters: meters(lat, lng, s.localY, s.localX) }))
    .filter((s) => s.meters <= radius)
    .sort((a, b) => a.meters - b.meters)
  stopCache.set(key, { at: Date.now(), stops })
  return stops
}

// 정류소 한 곳을 지나는 노선과 가장 가까운 버스의 예상 도착
export async function getStopArrivals(stationId) {
  const hit = arrivalCache.get(stationId)
  if (hit && Date.now() - hit.at < ARRIVAL_TTL) return hit.data
  const j = await bisPost('getArriveScheduleByStationId', { stationId })
  // 운행 중인 버스만, 같은 번호는 가장 빠른 한 대만, 빠른 순서로
  const running = (j.routeInfoList || []).filter((r) => r.predictTravTm > 0).sort((a, b) => a.predictTravTm - b.predictTravTm)
  const seen = new Set()
  const routes = running
    .filter((r) => !seen.has(r.routeNum) && seen.add(r.routeNum))
    .map((r) => ({ number: r.routeNum, to: r.dstNm, minutes: r.predictTravTm }))
  const data = { stop: j.stationNm, routes, runningCount: routes.length }
  arrivalCache.set(stationId, { at: Date.now(), data })
  return data
}

const routeCache = new Map() // stationId → { at, routes }
const routeStopCache = new Map() // routeId → { at, stops }

// 정류소에 서는 모든 노선(지금 운행 중인지는 상관없이). 방향이 정해진 노선 ID 단위.
export async function getStopRoutes(stationId) {
  const hit = routeCache.get(stationId)
  if (hit && Date.now() - hit.at < TTL) return hit.routes
  const j = await bisPost('getArriveScheduleByStationId', { stationId })
  const routes = (j.routeInfoList || []).map((r) => ({ routeId: r.routeId, number: r.routeNum, to: r.dstNm }))
  routeCache.set(stationId, { at: Date.now(), routes })
  return routes
}

// 노선 하나의 정류소를 순서대로
export async function getRouteStops(routeId) {
  const hit = routeStopCache.get(routeId)
  if (hit && Date.now() - hit.at < TTL) return hit.stops
  const r = await fetch(`https://bus.jeju.go.kr/api/searchBusRouteStationList.do?route_id=${routeId}`, { signal: AbortSignal.timeout(8000) })
  if (!r.ok) throw new Error(`bus.jeju.go.kr ${r.status}`)
  const rows = await r.json()
  const stops = (Array.isArray(rows) ? rows : []).map((x) => ({ id: x.STATION_ID, name: x.STATION_NM, ord: x.STATION_ORD }))
  routeStopCache.set(routeId, { at: Date.now(), stops })
  return stops
}

export async function getBusRoutes() {
  if (cache && Date.now() - cache.at < TTL) return cache.routes
  const rows = []
  for (let page = 1; page <= 12; page++) {
    const r = await fetch(`${BASE}/${busKey()}?number=${page}&limit=${PAGE}`)
    if (!r.ok) throw new Error(`jejudatahub ${r.status}`)
    const j = await r.json()
    rows.push(...(j.data || []))
    if (!j.hasMore) break
  }
  const routes = rows.map((x) => ({
    number: x.routeNumber,
    name: x.routeName,
    from: x.startStationName,
    to: x.endStationName,
    stops: Number(x.stationCount) || 0,
    km: Math.round(Number(x.routeLength) / 100) / 10,
  }))
  cache = { at: Date.now(), routes }
  return routes
}
