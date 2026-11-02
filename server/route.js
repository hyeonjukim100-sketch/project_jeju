// 하루 동선: 이동시간 계산(OSRM 공개 서버)과 기분에 맞춘 추천 동선 (규칙 기반이라 모델 호출이 필요 없다)
import { nearbyPlaces } from './kakao.js'
import { getSpots } from './tour.js'

const OSRM = 'https://router.project-osrm.org/route/v1/driving/'
export const MAX_LEG_MIN = 35 // 느린 일정: 한 구간 이동은 35분 안쪽

// points: [{lat, lng}] → 구간별 [{minutes, km}]
export async function legsOf(points) {
  if (points.length < 2) return []
  const coords = points.map((p) => `${p.lng},${p.lat}`).join(';')
  const r = await fetch(`${OSRM}${coords}?overview=false`, { headers: { 'User-Agent': 'JejuMaeumMap/0.1 (class project)' } })
  if (!r.ok) throw new Error(`osrm ${r.status}`)
  const j = await r.json()
  if (j.code !== 'Ok') throw new Error(`osrm ${j.code}`)
  return j.routes[0].legs.map((l) => ({ minutes: Math.round(l.duration / 60), km: Math.round(l.distance / 100) / 10 }))
}

const km = (a, b) => Math.hypot((a.lat - b.lat) * 111, (a.lng - b.lng) * 92)

// 기분 단계(0 지침 ~ 4 활기)별: 어울리는 종류, 후보 반경(km), 들를 장소 수
const PROFILE = [
  { kinds: ['사찰', '생태공원', '박물관', '문화유적', '문화', '자연'], radius: 10, count: 3 },
  { kinds: ['사찰', '생태공원', '박물관', '문화유적', '문화', '자연'], radius: 10, count: 3 },
  { kinds: ['자연', '문화', '생태공원', '오름', '사찰'], radius: 15, count: 3 },
  { kinds: ['오름', '자연', '트레일', '문화', '생태공원'], radius: 22, count: 4 },
  { kinds: ['오름', '자연', '트레일', '문화', '생태공원'], radius: 22, count: 4 },
]

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const stopOf = (s) => ({ type: 'spot', title: s.title, kind: s.kind, address: s.address, lat: s.lat, lng: s.lng, tourId: s.tourId || null })

async function restStop(near, calm) {
  // 지칠수록 전통찻집을 먼저 찾고, 없으면 가까운 카페
  const tries = calm ? [{ keyword: '전통찻집' }, { category: 'CE7' }] : [{ category: 'CE7' }]
  for (const t of tries) {
    const found = await nearbyPlaces({ lat: near.lat, lng: near.lng, radius: 4000, size: 5, ...t })
    if (found.length) {
      const p = found[0]
      return { type: 'rest', title: p.title, kind: p.category, address: p.address, lat: p.lat, lng: p.lng, url: p.url }
    }
  }
  return null
}

export async function buildRoute(moodLevel) {
  const prof = PROFILE[moodLevel] ?? PROFILE[2]
  const all = (await getSpots()).filter((s) => prof.kinds.includes(s.kind))
  const withPhoto = all.filter((s) => s.tourId)
  const anchor = pick(withPhoto.length ? withPhoto : all)

  // 반경 안의 후보 중 종류가 겹치지 않게 고르고, 가까운 순서로 잇는다
  const near = all.filter((s) => s.title !== anchor.title && km(anchor, s) <= prof.radius)
  const chosen = [anchor]
  for (const s of [...near].sort(() => Math.random() - 0.5)) {
    if (chosen.length >= prof.count) break
    if (!chosen.some((c) => c.kind === s.kind) || near.length < prof.count) chosen.push(s)
  }
  const ordered = [chosen[0]]
  const rest = chosen.slice(1)
  while (rest.length) {
    const last = ordered.at(-1)
    rest.sort((a, b) => km(last, a) - km(last, b))
    ordered.push(rest.shift())
  }

  let stops = ordered.map(stopOf)
  const cafe = await restStop(stops[Math.min(1, stops.length - 1)], moodLevel <= 1)
  if (cafe) stops.splice(Math.min(2, stops.length), 0, cafe) // 두 번째 장소 다음에 쉬어가기

  // 한 구간이 너무 멀면 그 장소를 빼고 다시 계산 (최대 3번)
  let legs = await legsOf(stops)
  for (let i = 0; i < 3 && legs.some((l) => l.minutes > MAX_LEG_MIN) && stops.length > 2; i++) {
    const bad = legs.findIndex((l) => l.minutes > MAX_LEG_MIN)
    const drop = stops[bad + 1].type === 'rest' ? bad : bad + 1
    stops = stops.filter((_, idx) => idx !== drop)
    legs = await legsOf(stops)
  }
  return { stops, legs }
}
