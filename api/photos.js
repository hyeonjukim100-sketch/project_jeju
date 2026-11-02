import { getPhotos } from '../server/tour.js'

// GET /api/photos?id=<tourId> 또는 ?lat=&lng= → 사진 [{url, credit, source}]
export default async function handler(req, res) {
  try {
    const q = new URL(req.url, 'http://x').searchParams
    const id = q.get('id')
    const lat = Number(q.get('lat'))
    const lng = Number(q.get('lng'))
    if (id && !/^\d+$/.test(id)) return res.status(400).json({ error: 'id 가 올바르지 않습니다' })
    if (!id && !(q.get('lat') && q.get('lng') && Number.isFinite(lat) && Number.isFinite(lng))) {
      return res.status(400).json({ error: 'id 또는 lat/lng 가 필요합니다' })
    }
    res.setHeader('Cache-Control', 's-maxage=86400')
    res.status(200).json({ photos: await getPhotos({ tourId: id, lat, lng }) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
