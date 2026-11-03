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

// 정류소·노선·도착 정보는 국토교통부 TAGO(server/tago.js)에서 가져온다. 바깥에서는 예전 이름 그대로 bus.js 에서 불러 쓴다.
export { getRouteStops, getStopArrivals, getStopRoutes, getStopsNear } from './tago.js'

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
