// Visit Jeju API (제주관광공사). 이름으로 한 건씩 찾아 대표 사진을 가져온다 (필요할 때만 요청해 호출을 아낀다).
const BASE = 'https://api.visitjeju.net/vsjApi/contents/searchList'

export async function findByTitle(title) {
  const key = process.env.VISIT_JEJU_API
  if (!key) return []
  const url = new URL(BASE)
  url.search = new URLSearchParams({ apiKey: key, locale: 'kr', page: 1, title })
  const r = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!r.ok) throw new Error(`visitjeju ${r.status}`)
  const j = await r.json()
  return j.result === '200' ? j.items || [] : []
}

const km = (a, b) => Math.hypot((a.lat - b.lat) * 111, (a.lng - b.lng) * 92)

// 같은 이름이 여럿이면 가까운 것을, 너무 멀면(2km 넘게) 다른 곳으로 보고 버린다
export async function visitJejuPhoto(title, { lat, lng }) {
  const items = await findByTitle(title)
  const near = items
    .filter((i) => i.repPhoto?.photoid?.imgpath && Number.isFinite(i.latitude))
    .map((i) => ({ i, d: km({ lat, lng }, { lat: i.latitude, lng: i.longitude }) }))
    .filter((x) => x.d <= 2)
    .sort((a, b) => a.d - b.d)[0]
  if (!near) return []
  return [{ url: near.i.repPhoto.photoid.imgpath, credit: '제주관광공사(Visit Jeju)', source: 'Visit Jeju' }]
}

// ── 음식점·카페(c4): 한 번 받아 서버에 저장해 두고, 카카오 결과에 사진과 태그를 겹친다 ──
const NOISE = /결제|주차|화장실|wifi|visitjeju|비짓제주|어려움|쉬움|보통|음료대|착한가격|가능|불가|체험|예약|무료|유료|^제주$|^서귀포$|^제주시$|맛집$|가볼만한곳|코스$/i
const cleanTags = (raw) => {
  const seen = new Set()
  return String(raw || '')
    .split(/[,#，]/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && t.length <= 10 && !NOISE.test(t) && !seen.has(t) && seen.add(t))
}

const FOOD_TTL = 6 * 60 * 60 * 1000
let food = null // { at, promise }

async function fetchFood() {
  const key = process.env.VISIT_JEJU_API
  if (!key) return []
  const page = async (p) => {
    const url = new URL(BASE)
    url.search = new URLSearchParams({ apiKey: key, locale: 'kr', page: p, category: 'c4' })
    const j = await (await fetch(url, { signal: AbortSignal.timeout(20000) })).json()
    return j
  }
  const first = await page(1)
  const rest = []
  for (let p = 2; p <= first.pageCount; p += 4) {
    rest.push(...(await Promise.all(Array.from({ length: Math.min(4, first.pageCount - p + 1) }, (_, i) => page(p + i)))))
  }
  return [first, ...rest]
    .flatMap((j) => j.items || [])
    .filter((i) => Number.isFinite(i.latitude) && i.repPhoto?.photoid?.thumbnailpath)
    .map((i) => ({ title: i.title, lat: i.latitude, lng: i.longitude, photo: i.repPhoto.photoid.thumbnailpath, tags: cleanTags(i.alltag).slice(0, 3) }))
}

function foodList() {
  if (!food || Date.now() - food.at > FOOD_TTL) {
    const promise = fetchFood().catch(() => {
      food = null // 실패하면 다음에 다시 시도한다
      return []
    })
    food = { at: Date.now(), promise }
  }
  return food.promise
}

const norm = (s) => String(s).replace(/[\s()·\-.]/g, '').toLowerCase()

// 카카오 가게 목록에 이름이 같고 가까운 Visit Jeju 항목의 사진·태그를 붙인다.
// 처음 한 번은 받아 오는 데 몇 초 걸리므로, 5초 안에 못 받으면 사진·태그 없이 먼저 돌려준다 (받기는 계속된다).
export async function attachFoodInfo(places) {
  if (!process.env.VISIT_JEJU_API) return places
  const list = await Promise.race([foodList(), new Promise((r) => setTimeout(() => r(null), 5000))])
  if (!list) return places
  return places.map((p) => {
    const n = norm(p.title)
    const hit = list
      .map((v) => ({ v, d: km({ lat: p.lat, lng: p.lng }, v), same: norm(v.title) === n || norm(v.title).includes(n) || n.includes(norm(v.title)) }))
      .filter((x) => x.same && x.d <= 0.3)
      .sort((a, b) => a.d - b.d)[0]
    return hit ? { ...p, vj: { photo: hit.v.photo, tags: hit.v.tags } } : p
  })
}
