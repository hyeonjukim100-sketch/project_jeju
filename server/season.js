// 계절 추천: Visit Jeju 관광지(c1)의 계절 태그와 이름을 규칙으로 걸러 계절마다 12곳을 고른다.
// (겨울의 실내는 계절이 아니라 날씨로 정한다 — 비·눈이 올 때만 "rainy" 로 실내 전시를 추천한다.)
const BASE = 'https://api.visitjeju.net/vsjApi/contents/searchList'
const TTL = 6 * 60 * 60 * 1000
let cache = null // { at, promise }

const NOISE = /결제|주차|화장실|wifi|visitjeju|비짓제주|어려움|쉬움|보통|음료대|가능|불가|예약|무료|유료|^제주$|^서귀포$|^제주시$|맑음|흐림|비\.눈|실내|실외|부모|커플|친구|혼자|아이|^봄$|^여름$|^가을$|^겨울$|^사계절$/
const tagsOf = (x) => (x.alltag || '').split(/[,#，]/).map((t) => t.trim()).filter(Boolean)
const cleanTags = (x) => {
  const seen = new Set()
  return tagsOf(x).filter((t) => t.length >= 2 && t.length <= 10 && !NOISE.test(t) && !seen.has(t) && seen.add(t)).slice(0, 3)
}

async function fetchAttractions() {
  const key = process.env.VISIT_JEJU_API
  if (!key) return []
  const page = async (p) => {
    const url = new URL(BASE)
    url.search = new URLSearchParams({ apiKey: key, locale: 'kr', page: p, category: 'c1' })
    return (await fetch(url, { signal: AbortSignal.timeout(20000) })).json()
  }
  const first = await page(1)
  const rest = []
  for (let p = 2; p <= first.pageCount; p += 4) {
    rest.push(...(await Promise.all(Array.from({ length: Math.min(4, first.pageCount - p + 1) }, (_, i) => page(p + i)))))
  }
  return [first, ...rest]
    .flatMap((j) => j.items || [])
    .filter((i) => Number.isFinite(i.latitude) && i.repPhoto?.photoid?.thumbnailpath)
    .map((i) => ({
      id: i.contentsid,
      title: i.title.trim(),
      address: i.roadaddress && i.roadaddress !== '-' ? i.roadaddress : i.address,
      lat: i.latitude,
      lng: i.longitude,
      intro: String(i.introduction || '').replace(/\s+/g, ' ').slice(0, 80),
      tags: cleanTags(i),
      allTags: tagsOf(i),
      photo: i.repPhoto.photoid.thumbnailpath,
    }))
}

function all() {
  if (!cache || Date.now() - cache.at > TTL) {
    const promise = fetchAttractions().catch(() => {
      cache = null // 실패하면 다음에 다시 시도한다
      return []
    })
    cache = { at: Date.now(), promise }
  }
  return cache.promise
}

const has = (x, re) => re.test(x.title) || x.allTags.some((t) => re.test(t))
const seasonTag = (x, s) => x.allTags.includes(s)

// 계절별 점수 (0 이면 후보에서 뺀다)
const RULES = {
  spring: (x) => {
    if (!has(x, /벚꽃|벚나무|왕벚|유채|수국|매화|튤립|양귀비|청보리|꽃길|꽃밭|꽃|동백/)) return 0
    return 1 + (seasonTag(x, '봄') ? 3 : 0) + (has(x, /벚꽃|벚나무|왕벚|유채/) ? 2 : 0) - (has(x, /동백|수국/) && !seasonTag(x, '봄') ? 1 : 0)
  },
  summer: (x) => {
    const beach = /해수욕장|해변|몽돌/.test(x.title)
    const sea = has(x, /서핑|카약|스노클|스쿠버|워터|물놀이|패들/)
    if (!beach && !sea) return 0
    return (beach ? 3 : 1) + (seasonTag(x, '여름') ? 2 : 0) + (sea ? 1 : 0)
  },
  autumn: (x) => {
    if (!has(x, /억새|단풍|오름|올레|숲길|둘레길|트레킹|걷기|산책/)) return 0
    return 1 + (has(x, /억새|단풍/) ? 3 : 0) + (seasonTag(x, '가을') ? 2 : 0) + (has(x, /오름|올레|숲길|둘레길/) ? 1 : 0) - (/순례/.test(x.title) ? 1 : 0)
  },
  winter: (x) => {
    if (!has(x, /눈꽃|설경|상고대|동백|한라산|영실|어리목|사려니|사라오름|천백고지|1100고지/) || /소주|술/.test(x.title)) return 0
    return 1 + (has(x, /눈꽃|설경|상고대|동백/) ? 3 : 0) + (has(x, /한라산|영실|어리목|사라오름|천백고지|1100고지/) ? 2 : 0) + (seasonTag(x, '겨울') ? 2 : 0)
  },
  // 비·눈이 오는 날: 실내에서 볼 전시 (휴관·폐업은 뺀다)
  rainy: (x) => (/박물관|미술관|전시관|뮤지엄|갤러리|체험관|아쿠아|기념관|테마파크/.test(x.title) && !/휴관|폐관|폐업|임시/.test(x.title) ? 3 : 0),
}

export const SEASON_NAMES = Object.keys(RULES)

const rnd = (seed) => {
  let h = 2166136261
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return ((h >>> 0) % 10000) / 10000
}

export async function getSeasonPicks(name) {
  const rule = RULES[name]
  if (!rule) return []
  const day = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)
  const list = await all()
  return list
    .map((x) => ({ x, score: rule(x) }))
    .filter((r) => r.score > 0)
    .map((r) => ({ ...r, score: r.score + rnd(`${day}-${name}-${r.x.id}`) })) // 같은 날엔 같은 순서, 날이 바뀌면 조금 섞인다
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map(({ x }) => ({ id: x.id, title: x.title, address: x.address, lat: x.lat, lng: x.lng, intro: x.intro, tags: x.tags, photo: x.photo }))
}
