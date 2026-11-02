import { getSpots } from '../server/tour.js'

// GET /api/spots → 관내 관광지(사진 포함)
export default async function handler(req, res) {
  try {
    const spots = await getSpots()
    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate')
    res.status(200).json({ count: spots.length, spots })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
