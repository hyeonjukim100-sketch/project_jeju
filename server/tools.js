// 에이전트가 쓰는 도구. 모델에는 이름·설명·인자 모양만 보이고, 실제 실행은 여기서 한다.
import { getOlleCourses } from './olle.js'
import { getSpots } from './tour.js'
import { getWeather } from './weather.js'

const short = (t, n) => (t.length > n ? `${t.slice(0, n)}…` : t)
const compact = (s) => ({ title: s.title, kind: s.kind, address: s.address, intro: short(s.intro, 90), hasPhoto: Boolean(s.tourId) })

export const TOOLS = [
  {
    name: 'get_weather',
    description: '제주의 지금 날씨, 기온, 체감온도, 미세먼지, 일출·일몰 시각, 자외선을 알려 줍니다.',
    parameters: { type: 'object', properties: {} },
    run: () => getWeather(),
  },
  {
    name: 'search_spots',
    description:
      '제주 관광지를 찾습니다. 종류(kind), 키워드, 지역으로 좁히고 최대 8곳을 돌려줍니다. 종류 예: 자연, 문화, 오름, 트레일, 사찰, 박물관, 문화유적, 시장, 예술, 올레코스, 생태공원, 지질트레일.',
    parameters: {
      type: 'object',
      properties: {
        kind: { type: 'string', description: '관광지 종류 (일부만 써도 됩니다)' },
        keyword: { type: 'string', description: '이름·주소·소개에 들어 있는 낱말' },
        area: { type: 'string', description: '제주시 또는 서귀포시' },
      },
    },
    run: async ({ kind, keyword, area } = {}) => {
      let list = await getSpots()
      if (kind) list = list.filter((s) => s.kind?.includes(kind))
      if (keyword) list = list.filter((s) => `${s.title} ${s.address} ${s.intro}`.includes(keyword))
      if (area) list = list.filter((s) => s.address.includes(area))
      const picked = [...list].sort(() => Math.random() - 0.5).slice(0, 8) // 매번 같은 곳만 나오지 않게 섞는다
      return { matched: list.length, spots: picked.map(compact) }
    },
  },
  {
    name: 'search_olle_courses',
    description:
      '제주 올레길 코스를 찾습니다. 코스 이름·거리(km)·걷는 데 걸리는 시간·시작과 끝 지점을 줍니다. 짧고 가벼운 코스를 찾을 때는 max_km 를, 지역 이름(예: 성산, 서귀포, 우도)은 keyword 로 씁니다.',
    parameters: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: '코스 이름이나 시종점에 들어 있는 낱말' },
        max_km: { type: 'number', description: '이 거리(km) 이하의 코스만' },
      },
    },
    run: async ({ keyword, max_km } = {}) => {
      let list = await getOlleCourses()
      if (keyword) list = list.filter((c) => `${c.name} ${c.route}`.includes(keyword))
      if (max_km) list = list.filter((c) => c.km <= max_km)
      return { matched: list.length, courses: list.slice(0, 8).map((c) => ({ course: `${c.id}코스`, name: c.name, km: c.km, time: c.time, route: c.route })) }
    },
  },
  {
    name: 'get_spot_detail',
    description: '관광지 한 곳의 자세한 소개와 주소, 위치를 돌려줍니다. 이름은 search_spots 결과의 title 과 같아야 합니다.',
    parameters: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] },
    run: async ({ title } = {}) => {
      const s = (await getSpots()).find((x) => x.title === title)
      return s ? { title: s.title, kind: s.kind, address: s.address, intro: short(s.intro, 600), lat: s.lat, lng: s.lng } : { error: '그 이름의 관광지를 찾지 못했어요' }
    },
  },
]
