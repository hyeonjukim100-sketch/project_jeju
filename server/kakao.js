// 카카오 로컬: 근처 카페·식당. 이름·분류·주소·위치·링크만 준다 (별점·사진·분위기는 없다).
const BASE = 'https://dapi.kakao.com/v2/local/search'

function headers() {
  const key = process.env.KAKAO_REST_KEY
  if (!key) throw new Error('KAKAO_REST_KEY 가 설정되지 않았습니다 (.env.local)')
  return { Authorization: `KakaoAK ${key}` }
}

const compact = (d) => ({
  id: d.id,
  title: d.place_name,
  category: d.category_name.split(' > ').slice(-2).join(' > '),
  address: d.road_address_name || d.address_name,
  phone: d.phone || '',
  url: d.place_url,
  lat: Number(d.y),
  lng: Number(d.x),
  distance: Number(d.distance) || 0,
})

// category: 'CE7'(카페) | 'FD6'(음식점), 또는 keyword (예: '전통찻집')
export async function nearbyPlaces({ lat, lng, category, keyword, radius = 3000, size = 8 }) {
  const url = new URL(`${BASE}/${keyword ? 'keyword' : 'category'}.json`)
  const params = { x: lng, y: lat, radius, size, sort: 'distance' }
  if (keyword) params.query = keyword
  else params.category_group_code = category
  url.search = new URLSearchParams(params)
  const r = await fetch(url, { headers: headers() })
  if (!r.ok) throw new Error(`kakao ${r.status}`)
  return (await r.json()).documents.map(compact)
}
