// 두 곳 사이에서 탈 수 있는 직행 버스 찾기. 출발지·도착지 근처 정류소를 구하고, 같은 노선(방향이 정해진 노선 ID)에서
// 승차 정류소가 하차 정류소보다 앞에 있는 것만 남긴다. 환승은 찾지 않는다.
import { getRouteStops, getStopArrivals, getStopRoutes, getStopsNear } from './bus.js'

const NEAR_RADIUS = 1000 // m
const NEAR_COUNT = 3 // 가까운 정류소 몇 곳까지 후보로
const MAX_OPTIONS = 3
const PARALLEL = 6

// 정류장 수가 적고 걷는 거리가 짧을수록 좋다
const score = (stops, board, alight) => stops + (board.meters + alight.meters) / 100

export function findDirectRoutes({ board, alight, routesAtBoard, routeStops }) {
  const found = []
  for (const b of board) {
    for (const r of routesAtBoard[b.id] || []) {
      const list = routeStops[r.routeId]
      const from = list?.find((s) => s.id === b.id)
      if (!from) continue
      for (const a of alight) {
        const to = list.find((s) => s.id === a.id)
        if (to && to.ord > from.ord) {
          const stops = to.ord - from.ord
          found.push({ number: r.number, to: r.to, board: b, alight: a, stops, _score: score(stops, b, a) })
        }
      }
    }
  }
  found.sort((x, y) => x._score - y._score)
  const seen = new Set()
  return found
    .filter((o) => !seen.has(o.number) && seen.add(o.number))
    .slice(0, MAX_OPTIONS)
    .map(({ _score, ...o }) => o)
}

// 같은 시각에 PARALLEL 개까지만 호출한다
async function mapLimit(items, fn) {
  const out = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(PARALLEL, items.length) }, async () => {
      while (next < items.length) {
        const i = next++
        out[i] = await fn(items[i])
      }
    }),
  )
  return out
}

const near = (p) => getStopsNear(p.lat, p.lng, NEAR_RADIUS).then((l) => l.slice(0, NEAR_COUNT).map(({ id, name, meters }) => ({ id, name, meters })))

const DEFAULT_DEPS = { nearStops: near, stopRoutes: getStopRoutes, routeStops: getRouteStops, arrivals: getStopArrivals }

// deps 는 시험에서 가짜 조회 함수를 넣기 위한 자리다. 정류소·노선 하나의 조회가 실패해도 나머지로 계속한다.
export async function getBusLeg(from, to, deps = DEFAULT_DEPS) {
  const [board, alight] = await Promise.all([deps.nearStops(from), deps.nearStops(to)])
  if (!board.length || !alight.length) return { options: [] }

  const atBoard = await mapLimit(board, (b) => deps.stopRoutes(String(b.id)).catch(() => []))
  const routesAtBoard = Object.fromEntries(board.map((b, i) => [b.id, atBoard[i]]))
  const routeIds = [...new Set(atBoard.flat().map((r) => r.routeId))]
  const stopLists = await mapLimit(routeIds, (id) => deps.routeStops(id).catch(() => []))
  const routeStops = Object.fromEntries(routeIds.map((id, i) => [id, stopLists[i]]))

  const options = findDirectRoutes({ board, alight, routesAtBoard, routeStops })
  // 승차 정류소에 다음 버스가 몇 분 뒤에 오는지 (모르면 null)
  const withNext = await mapLimit(options, async (o) => {
    const minutes = await deps
      .arrivals(String(o.board.id))
      .then((a) => a.routes.find((r) => r.number === o.number)?.minutes ?? null)
      .catch(() => null)
    return { ...o, nextMin: minutes }
  })
  return { options: withNext }
}
