// 제주 버스 정류소·노선·도착 정보: 국토교통부 TAGO 공공데이터 (공공데이터포털, 제주 도시코드 39).
// 활용신청이 필요한 서비스: 버스정류소정보, 버스노선정보, 버스도착정보. 인증키는 관광 API 와 같은 DATA_GO_KR_KEY.
const BASE = 'https://apis.data.go.kr/1613000'
const CITY = '39' // 제주
const TTL = 24 * 60 * 60 * 1000
const ARRIVAL_TTL = 20 * 1000

// 응답 하나에서 item 목록 꺼내기: 한 건이면 객체, 없으면 빈 문자열로 오고, 오류는 다른 모양으로 온다
export function parseItems(j) {
  const err = j?.OpenAPI_ServiceResponse?.cmmMsgHeader
  if (err) throw new Error(`tago ${err.errMsg || err.returnAuthMsg || 'error'}`)
  const code = j?.response?.header?.resultCode
  if (code && code !== '00') throw new Error(`tago ${j.response.header.resultMsg || code}`)
  const item = j?.response?.body?.items?.item
  return item == null || item === '' ? [] : Array.isArray(item) ? item : [item]
}

const meters = (aLat, aLng, bLat, bLng) => {
  const rad = Math.PI / 180
  const dLat = (bLat - aLat) * rad
  const dLng = (bLng - aLng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * 6371000 * Math.asin(Math.sqrt(h)))
}

export function toStops(rows, lat, lng, radius) {
  return rows
    .filter((s) => String(s.citycode) === CITY)
    .map((s) => ({ id: s.nodeid, name: s.nodenm, lat: Number(s.gpslati), lng: Number(s.gpslong), meters: meters(lat, lng, Number(s.gpslati), Number(s.gpslong)) }))
    .filter((s) => s.meters <= radius)
    .sort((a, b) => a.meters - b.meters)
}

export const toRoutes = (rows) => rows.map((r) => ({ routeId: r.routeid, number: String(r.routeno), to: r.endnodenm }))

export const toRouteStops = (rows) => rows.map((x) => ({ id: x.nodeid, name: x.nodenm, ord: Number(x.nodeord) })).sort((a, b) => a.ord - b.ord)

// 운행 중인 버스(도착까지 남은 초가 있는 것)만, 같은 번호는 가장 빠른 한 대만, 빠른 순서로
export function toArrivals(rows) {
  const running = rows.filter((r) => Number(r.arrtime) > 0).sort((a, b) => Number(a.arrtime) - Number(b.arrtime))
  const seen = new Set()
  const routes = running
    .filter((r) => !seen.has(String(r.routeno)) && seen.add(String(r.routeno)))
    .map((r) => ({ number: String(r.routeno), to: r.endnodenm ?? null, minutes: Math.max(1, Math.round(Number(r.arrtime) / 60)) }))
  return { stop: rows[0]?.nodenm ?? null, routes, runningCount: routes.length }
}

// TAGO 는 동시 접속이 몰리면 "가용한 세션이 없다"며 잠깐 실패한다 — 짧게 쉬었다가 다시 시도한다
export async function withRetry(fn, tries = 3, delay = 400) {
  for (let i = 1; ; i++) {
    try {
      return await fn()
    } catch (e) {
      if (i >= tries || e.fatal) throw e // 키 문제는 다시 해도 같다
      await new Promise((r) => setTimeout(r, delay * i))
    }
  }
}

async function tagoGetOnce(path, params) {
  const key = process.env.DATA_GO_KR_KEY
  if (!key) throw new Error('DATA_GO_KR_KEY 가 설정되지 않았습니다')
  const url = new URL(`${BASE}/${path}`)
  url.search = new URLSearchParams({ serviceKey: key, _type: 'json', pageNo: '1', ...params })
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) })
  const text = await r.text()
  let j
  try {
    j = JSON.parse(text)
  } catch {
    throw new Error(`tago ${r.status} ${text.slice(0, 60).replace(key, '')}`)
  }
  try {
    return parseItems(j)
  } catch (e) {
    if (/SERVICE_KEY|ACCESS_DENIED|NOT_REGISTERED/i.test(e.message)) e.fatal = true
    throw e
  }
}

async function tagoGet(path, params) {
  return withRetry(() => tagoGetOnce(path, params))
}

export const memo = (map, key, ttl, load) => {
  const hit = map.get(key)
  if (hit && Date.now() - hit.at < ttl) return Promise.resolve(hit.value)
  return load().then((value) => (map.set(key, { at: Date.now(), value }), value))
}

const stopCache = new Map()
const routeCache = new Map()
const routeStopCache = new Map()
const arrivalCache = new Map()

// 좌표 주변 정류소를 가까운 순서로 (radius m 안쪽)
export const getStopsNear = (lat, lng, radius = 600) =>
  memo(stopCache, `${lat.toFixed(4)},${lng.toFixed(4)},${radius}`, TTL, async () =>
    toStops(await tagoGet('BusSttnInfoInqireService/getCrdntPrxmtSttnList', { gpsLati: lat, gpsLong: lng, numOfRows: '30' }), lat, lng, radius),
  )

// 정류소에 서는 모든 노선 (방향이 정해진 노선 ID 단위)
export const getStopRoutes = (stationId) =>
  memo(routeCache, stationId, TTL, async () => toRoutes(await tagoGet('BusSttnInfoInqireService/getSttnThrghRouteList', { cityCode: CITY, nodeid: stationId, numOfRows: '100' })))

// 노선 하나의 정류소를 순서대로
export const getRouteStops = (routeId) =>
  memo(routeStopCache, routeId, TTL, async () => toRouteStops(await tagoGet('BusRouteInfoInqireService/getRouteAcctoThrghSttnList', { cityCode: CITY, routeId, numOfRows: '300' })))

// 정류소 한 곳의 도착 예정 버스
export const getStopArrivals = (stationId) =>
  memo(arrivalCache, stationId, ARRIVAL_TTL, async () => toArrivals(await tagoGet('ArvlInfoInqireService/getSttnAcctoArvlPrearngeInfoList', { cityCode: CITY, nodeId: stationId, numOfRows: '50' })))
