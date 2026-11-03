// 제주특별자치도 관내 관광지 + 관광지 이미지 (공공데이터포털 odcloud)
import { visitJejuPhoto } from './visitjeju.js'
import { AUTO_FIXES, HIDDEN_IDS } from './coordFixes.js'

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

// 여행지로 보여 주지 않을 것: 병원류(의료), 날짜 정보가 없는 축제·행사, 기타 중 학교·여객선·병의원 같은 시설,
// 그리고 관광지 데이터에서 위치가 잘못 찍힌 "제주올레 11코스"(우도에 찍혀 있으나 실제 11코스는 모슬포~무릉)
const HIDDEN_KINDS = ['의료', '축제', '축제/행사']
const NOT_TRAVEL = /초등학교|분교|여객선|의원|병원|치과|한의원|피부과|약국/
const HIDDEN_TITLES = ['제주올레 11코스', '삼양방파제'] // 삼양방파제: 주소·좌표가 성산일출봉 것으로 잘못 들어 있음
const isTravel = (s) => !HIDDEN_KINDS.includes(s.kind) && !(s.kind === '기타' && NOT_TRAVEL.test(s.title)) && !HIDDEN_TITLES.includes(s.title)

// 원본 좌표가 틀린 곳은 카카오 로컬 검색 값으로 덮어쓴다 (2026-11-03 확인)
// 성산일출봉: 서쪽 한림 쪽에 찍혀 있었음 / 산방산·산방굴사: 추자도(위도 33.96)로 찍혀 있었으나 실제는 안덕면
const FIXES = {
  성산일출봉: { lat: 33.459135, lng: 126.940538 },
  '우도(해양도립공원)': { lat: 33.50645, lng: 126.95299 }, // 원본은 우도 서쪽 바다에 찍혀 있음
  산방산: { lat: 33.241564, lng: 126.31337, address: '제주특별자치도 서귀포시 안덕면 사계리' },
  산방굴사: { lat: 33.237963, lng: 126.313091, address: '제주특별자치도 서귀포시 안덕면 사계리' },
  // 아래는 전수 검토(docs/coord-check.md)에서 카카오 이름·종류·주소가 모두 맞아 보정한 곳. 오름·행사·이름이 겹치는 곳은 제외
  '단산과 방사탑': { lat: 33.2417, lng: 126.28261, address: '제주특별자치도 서귀포시 대정읍 인성리' },
  제주곶자왈도립공원: { lat: 33.28895, lng: 126.27172, address: '제주특별자치도 서귀포시 대정읍 에듀시티로 178' },
  감사공묘역: { lat: 33.51301, lng: 126.66086, address: '제주특별자치도 제주시 조천읍 함대로 362' },
  화북비석거리: { lat: 33.52042, lng: 126.5605, address: '제주특별자치도 제주시 화북일동 4008' },
  삼성혈: { lat: 33.50443, lng: 126.52876, address: '제주특별자치도 제주시 삼성로 22' },
  '중문리 신사터': { lat: 33.25361, lng: 126.42103, address: '제주특별자치도 서귀포시 천제연로 149' },
  산지천갤러리: { lat: 33.51515, lng: 126.52833, address: '제주특별자치도 제주시 중앙로3길 36' },
  온평리포구: { lat: 33.40166, lng: 126.90284, address: '제주특별자치도 서귀포시 성산읍 온평리' },
  성읍민속마을: { lat: 33.39999, lng: 126.80609, address: '제주특별자치도 서귀포시 표선면 서성일로 109' },
  북촌환해장성: { lat: 33.55259, lng: 126.70117, address: '제주특별자치도 제주시 조천읍 북촌리 393-3' },
  망장포: { lat: 33.2592, lng: 126.63969, address: '제주특별자치도 서귀포시 남원읍 하례리' },
  세계술박물관: { lat: 33.35397, lng: 126.81761, address: '제주특별자치도 서귀포시 표선면 한마음초등로 431' },
  영모원: { lat: 33.47201, lng: 126.41734, address: '제주특별자치도 제주시 애월읍 하귀1리 1134-1' },
  비자림: { lat: 33.49041, lng: 126.80999, address: '제주특별자치도 제주시 구좌읍 비자숲길 55' },
  서귀포층패류화석산지: { lat: 33.23952, lng: 126.55805, address: '제주특별자치도 서귀포시 남성중로 43' },
  마라도관광쉼터: { lat: 33.11411, lng: 126.26844, address: '제주특별자치도 서귀포시 대정읍 마라로 131' },
  무릉곶자왈: { lat: 33.29154, lng: 126.26254, address: '제주특별자치도 서귀포시 대정읍 무릉리 산 1' },
}

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
    .map((sp) => ({ ...sp, ...AUTO_FIXES[sp.id], ...FIXES[sp.title] })) // 손으로 확인한 값이 자동 보정보다 우선
    .filter((sp) => FIXES[sp.title] || !HIDDEN_IDS.has(sp.id)) // 주소와 좌표가 어긋나 어느 쪽이 맞는지 모르는 곳(coordFixes.js)은 숨긴다
    .map((sp) => ({ ...sp, tourId: nearestTourId(sp, tourSpots) }))
    .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng) && s.lat > 33 && s.lat < 34)
    .filter(isTravel)
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
