// 에이전트가 쓰는 도구. 모델에는 이름·설명·인자 모양만 보이고, 실제 실행은 여기서 한다.
import { getBusRoutes, getStopArrivals, getStopsNear } from './bus.js'
import { findPlace } from './kakao.js'
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
  {
    name: 'search_bus_routes',
    description:
      '제주 버스 노선을 찾습니다. 노선 번호, 출발·종점 정류소 이름, 정류소 수, 노선 거리(km)를 줍니다. 관광지 근처 정류소와 도착 시간은 find_bus_stops_near, get_bus_arrivals 로 확인합니다. 배차 간격은 알 수 없으니 지어내지 말고 제주버스정보시스템 앱에서 확인하라고 안내합니다.',
    parameters: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: '노선 번호나 출발·종점 정류소에 들어 있는 낱말 (예: 101, 공항, 서귀포)' },
      },
    },
    run: async ({ keyword } = {}) => {
      let list = await getBusRoutes()
      if (keyword) list = list.filter((r) => `${r.number} ${r.name} ${r.from} ${r.to}`.includes(keyword))
      return { matched: list.length, routes: list.slice(0, 8) }
    },
  },
  {
    name: 'find_bus_stops_near',
    description:
      '장소 근처 버스 정류소를 가까운 순서로 최대 5곳 찾습니다. 정류소 이름, 걸어서 가야 하는 거리(m), 정류소 id 를 줍니다. place 에는 사용자가 말한 장소 이름을 그대로 넣으면 됩니다 (관광지 목록에 없어도 됩니다). 도착 시각은 get_bus_arrivals 로 확인합니다.',
    parameters: { type: 'object', properties: { place: { type: 'string', description: '장소 이름 (예: 성산일출봉, 제주공항)' } }, required: ['place'] },
    run: async ({ place } = {}) => {
      if (!place) return { error: '장소 이름이 필요해요' }
      // 관광지 목록의 좌표가 틀린 곳이 있어(예: 성산일출봉) 카카오 위치를 먼저 쓰고, 안 되면 목록으로
      let p = await findPlace(place).catch(() => null)
      if (!p) p = (await getSpots()).find((x) => x.title === place || x.title.includes(place))
      if (!p?.lat || !p?.lng) return { error: '그 장소의 위치를 찾지 못했어요' }
      const stops = await getStopsNear(Number(p.lat), Number(p.lng), 1000)
      return stops.length ? { place: p.title, stops: stops.slice(0, 5).map(({ id, name, meters }) => ({ id, name, meters })) } : { place: p.title, stops: [], note: '1km 안에 정류소가 없어요' }
    },
  },
  {
    name: 'get_bus_arrivals',
    description:
      '정류소 한 곳에 곧 도착하는 버스를 번호별로 가장 빠른 한 대씩, 빠른 순서로 줍니다 (minutes 는 예상 도착까지 분). routes 가 비어 있으면 지금 운행 중인 버스가 없다는 뜻입니다. 정류소 id 는 find_bus_stops_near 결과의 id 입니다.',
    parameters: { type: 'object', properties: { station_id: { type: 'string', description: '정류소 id (예: JEB405002100)' } }, required: ['station_id'] },
    run: async ({ station_id } = {}) => {
      if (!station_id) return { error: '정류소 id 가 필요해요' }
      const a = await getStopArrivals(String(station_id))
      return { stop: a.stop, routes: a.routes.slice(0, 4) }
    },
  },
]
