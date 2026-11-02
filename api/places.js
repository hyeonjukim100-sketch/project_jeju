import { nearbyPlaces } from '../server/kakao.js'

// GET /api/places?lat=&lng=&category=CE7|FD6  → 가까운 카페·식당
export default async function handler(req, res) {
  try {
    const q = new URL(req.url, 'http://x').searchParams
    const lat = Number(q.get('lat'))
    const lng = Number(q.get('lng'))
    const category = q.get('category')
    if (!(lat > 33 && lat < 34 && lng > 126 && lng < 127.2)) return res.status(400).json({ error: '제주 안의 위치가 필요해요' })
    if (!['CE7', 'FD6'].includes(category)) return res.status(400).json({ error: 'category 는 CE7 또는 FD6' })
    res.setHeader('Cache-Control', 's-maxage=3600')
    res.status(200).json({ places: await nearbyPlaces({ lat, lng, category, radius: 2000, size: 6 }) })
  } catch (e) {
    console.error('places error:', e.message)
    res.status(500).json({ error: '근처 장소를 가져오지 못했어요' })
  }
}
