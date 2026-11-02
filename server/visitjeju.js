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
