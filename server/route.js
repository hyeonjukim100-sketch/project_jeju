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

// 점심 식사: 두 번째 장소 가까이의 식당 (카카오 로컬)
async function mealStop(near) {
  const found = await nearbyPlaces({ lat: near.lat, lng: near.lng, category: 'FD6', radius: 3000, size: 5 })
  const p = found[0]
  return p ? { type: 'meal', title: p.title, kind: p.category, address: p.address, lat: p.lat, lng: p.lng, url: p.url } : null
}

// 하루 추천 동선: 오전 2곳 → 점심 → 오후 1~2곳 (그 사이 카페 쉬어가기). 기분에 맞는 종류와 반경으로 고른다.
// 한 구간이 35분을 넘으면 그 장소를 빼는 대신 다른 후보로 처음부터 다시 고른다 (최대 6번).
export async function buildRoute(moodLevel) {
  const prof = PROFILE[moodLevel] ?? PROFILE[2]
  const all = (await getSpots()).filter((s) => prof.kinds.includes(s.kind))
  const withPhoto = all.filter((s) => s.tourId)
  const want = prof.count // 들를 관광지 수 (지친 날 3, 활기찬 날 4)

  let best = null
  for (let attempt = 0; attempt < 6; attempt++) {
    const anchor = pick(withPhoto.length ? withPhoto : all)

    // 후보가 모자라면 반경을 넓혀 가며 모은다
    let near = []
    for (let r = prof.radius; r <= 30; r *= 1.4) {
      near = all.filter((s) => s.title !== anchor.title && km(anchor, s) <= r)
      if (near.length >= want * 3) break
    }
    const chosen = [anchor]
    for (const s of [...near].sort(() => Math.random() - 0.5)) {
      if (chosen.length >= want) break
      if (!chosen.some((c) => c.kind === s.kind) || near.length < want * 2) chosen.push(s)
    }
    if (chosen.length < Math.min(want, 3)) continue

    // 가까운 순서로 잇고, 이웃한 장소끼리 직선으로 너무 멀면(20km 넘게) 이번 시도는 버린다
    const ordered = [chosen[0]]
    const rest = chosen.slice(1)
    while (rest.length) {
      const last = ordered.at(-1)
      rest.sort((a, b) => km(last, a) - km(last, b))
      ordered.push(rest.shift())
    }
    if (ordered.some((s, i) => i > 0 && km(ordered[i - 1], s) > 20)) continue

    // 오전: 장소1, 장소2 → 점심 → 장소3 → 카페 → (장소4)
    const spotsStops = ordered.map(stopOf)
    const meal = spotsStops.length >= 2 ? await mealStop(spotsStops[1]) : null
    const cafe = await restStop(spotsStops[Math.min(2, spotsStops.length - 1)], moodLevel <= 1)
    const stops = []
    spotsStops.forEach((s, i) => {
      stops.push(s)
      if (i === 1 && meal) stops.push(meal)
      if (i === 2 && cafe) stops.push(cafe)
    })
    if (spotsStops.length < 3 && cafe) stops.push(cafe)

    const legs = await legsOf(stops)
    const bad = legs.filter((l) => l.minutes > MAX_LEG_MIN).length
    const score = stops.length * 10 - bad * 12
    if (!best || score > best.score) best = { stops, legs, score }
    if (!bad && stops.length >= want + 1) break
  }

  if (!best) throw new Error('추천 동선을 만들지 못했어요')
  // 6번 시도해도 너무 먼 구간이 남았다면, 그 구간 뒤의 장소를 하나씩 빼서 맞춘다 (마지막 수단)
  let { stops, legs } = best
  for (let i = 0; i < 2 && legs.some((l) => l.minutes > MAX_LEG_MIN) && stops.length > 4; i++) {
    const badIdx = legs.findIndex((l) => l.minutes > MAX_LEG_MIN)
    stops = stops.filter((_, idx) => idx !== badIdx + 1)
    legs = await legsOf(stops)
  }
  return { stops, legs }
}
