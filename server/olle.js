// 제주 올레코스 현황 (공공데이터포털 odcloud). 코스 이름·거리·소요시간·시종점만 있고 좌표는 없다.
// 지도에 그리는 선은 OpenStreetMap 에서 받아 src/data/olle-lines.json 에 코스 번호별로 저장해 두었다.
import { dataGoKey } from './tour.js'

const PATH = 'https://api.odcloud.kr/api/15043496/v1/uddi:5e0b77df-759d-4378-a74f-bd393051521b'
const TTL = 6 * 60 * 60 * 1000
let cache = null

// "7-1코스" → "7-1", "3코스" → "3"
const courseId = (s) => String(s).replace('코스', '').trim()

export async function getOlleCourses() {
  if (cache && Date.now() - cache.at < TTL) return cache.courses
  const url = new URL(PATH)
  url.search = new URLSearchParams({ page: 1, perPage: 100, returnType: 'JSON', serviceKey: dataGoKey() })
  const r = await fetch(url)
  if (!r.ok) throw new Error(`odcloud ${r.status}`)
  const rows = (await r.json()).data
  const courses = rows.map((x) => ({
    id: courseId(x['코스별']),
    name: String(x['코스명']).replace(/\?/g, '–'), // 원본에 '–' 가 '?' 로 깨져 있다
    km: parseFloat(x['거리']),
    time: x['소요시간정보'],
    route: String(x['시종점정보']).replace(/\?/g, '–'),
  }))
  cache = { at: Date.now(), courses }
  return courses
}
