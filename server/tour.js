// 제주특별자치도 관내 관광지 + 관광지 이미지 (공공데이터포털 odcloud)
import { visitJejuPhoto } from './visitjeju.js'

const OD ='https://api.odcloud.kr/api'
const SPOT_PATH = '/15111742/v1/uddi:735137ac-cee5-42f5-9119-a8b6c9f784dc'

// 포털에서 받은 키가 인코딩 키(%)면 한 번 풀어서 쓴다
export function dataGoKey() {
  const key = process.env.DATA_GO_KR_KEY || ''
  if (!key) throw new Error('DATA_GO_KR_KEY 가 설정되지 않았습니다 (.env.local)')
  return key.includes('%') ? decodeURIComponent(key) : key
}

async function odcloud(path, page, perPage) {
  const url = new URL(OD + path)
  url.search = new URLSearchParams({ page, perPage, returnType: 'JSON', serviceKey: dataGoKey() })
  const r = await fetch(url)
  if (!r.ok) throw new Error(`odcloud ${r.status}`)
  return r.json()
}

async function fetchAll(path) {
  const first = await odcloud(path, 1, 1000)
  const pages = Math.ceil(first.totalCount / 1000)
  const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => odcloud(path, i + 2, 1000)))
  return [first, ...rest].flatMap((p) => p.data)
}

let cache = null // { at, spots }
const TTL = 6 * 60 * 60 * 1000

export async function getSpots() {
  if (cache && Date.now() - cache.at < TTL) return cache.spots
  const [rows, tourSpots] = await Promise.all([fetchAll(SPOT_PATH), tour('areaBasedList2', { areaCode: '39', contentTypeId: '12', numOfRows: '300', pageNo: '1' })])
  const spots = rows
    .map((r) => ({
      id: String(r['연번']),
      title: r['관광지명'],
      kind: r['관광지 분야'],
      lat: Number(r['위도']),
      lng: Number(r['경도']),
      address: r['소재지도로명주소'] || r['소재지지번주소'] || '',
      intro: r['관광지소개'] || '',
    }))
    .map((sp) => ({ ...sp, tourId: nearestTourId(sp, tourSpots) }))
    .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng) && s.lat > 33 && s.lat < 34)
  cache = { at: Date.now(), spots }
  return spots
}

// 사진: 한국관광공사 TourAPI(KorService2). 관내 관광지 이미지 데이터셋의 주소(api.brandcontents.or.kr)가
// 더 이상 열리지 않아(도메인 소멸) 같은 키로 쓸 수 있는 TourAPI 로 대체했다.
const TOUR = 'https://apis.data.go.kr/B551011/KorService2'
async function tour(op, params) {
  const url = new URL(`${TOUR}/${op}`)
  url.search = new URLSearchParams({ serviceKey: dataGoKey(), MobileOS: 'ETC', MobileApp: 'JejuMind', _type: 'json', ...params })
  const r = await fetch(url)
  if (!r.ok) throw new Error(`tourapi ${r.status}`)
  const body = (await r.json()).response?.body
  const item = body?.items?.item
  return item ? [].concat(item) : []
}

// 같은 곳으로 볼 만큼(200m 이내) 가까운 TourAPI 관광지의 contentId. 이름이 달라도 위치로 잇는다.
function nearestTourId(spot, tourSpots) {
  let best = 0.2
  let id = null
  for (const t of tourSpots) {
    const d = Math.hypot((spot.lat - Number(t.mapy)) * 111, (spot.lng - Number(t.mapx)) * 92)
    if (d < best) [best, id] = [d, t.contentid]
  }
  return id
}

const photoCache = new Map()
const https = (u) => (u || '').replace(/^http:\/\//, 'https://')

// 위키미디어 커먼즈: 좌표 반경 안의 사진 (키 없음, 요청이 몰리면 제한되므로 결과를 캐시한다)
async function commonsPhotos(lat, lng) {
  const url = new URL('https://commons.wikimedia.org/w/api.php')
  url.search = new URLSearchParams({
    action: 'query', format: 'json', generator: 'geosearch', ggscoord: `${lat}|${lng}`,
    ggsradius: '400', ggsnamespace: '6', ggslimit: '10', prop: 'imageinfo',
    iiprop: 'url|extmetadata|mime', iiurlwidth: '800', origin: '*',
  })
  const r = await fetch(url, { headers: { 'User-Agent': 'JejuMaeumMap/0.1 (class project)' } })
  if (!r.ok) throw new Error(`commons ${r.status}`)
  const pages = Object.values((await r.json()).query?.pages || {})
  return pages
    .map((p) => p.imageinfo?.[0])
    .filter((i) => i && i.mime === 'image/jpeg')
    .map((i) => ({
      url: i.thumburl || i.url,
      credit: `${(i.extmetadata?.Artist?.value || '작성자 미상').replace(/<[^>]+>/g, '').trim()} · ${i.extmetadata?.LicenseShortName?.value || 'Wikimedia Commons'}`,
      source: 'Wikimedia Commons',
    }))
}

// 사진 목록: 한국관광공사 TourAPI → 없으면 Visit Jeju(이름이 같은 곳) → 없으면 위키미디어 커먼즈(근처 사진)
export async function getPhotos({ tourId, title, lat, lng }) {
  const key = tourId || `${title || ''}@${lat},${lng}`
  if (photoCache.has(key)) return photoCache.get(key)
  let photos = []
  try {
    if (tourId) {
      const imgs = await tour('detailImage2', { contentId: tourId, imageYN: 'Y', numOfRows: '12', pageNo: '1' })
      photos = imgs.map((i) => ({ url: https(i.originimgurl), credit: '한국관광공사', source: 'TourAPI' })).filter((p) => p.url)
    }
    if (!photos.length && title && Number.isFinite(lat) && Number.isFinite(lng)) {
      photos = await visitJejuPhoto(title, { lat, lng }).catch(() => [])
    }
    if (!photos.length && Number.isFinite(lat) && Number.isFinite(lng)) {
      photos = await commonsPhotos(lat, lng)
    }
  } catch {
    return [] // 일시적 실패는 캐시하지 않는다
  }
  photoCache.set(key, photos)
  return photos
}
