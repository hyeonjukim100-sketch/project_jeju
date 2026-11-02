import { getWeather } from '../server/weather.js'

// GET /api/weather → 제주 현재 날씨·대기질·일출일몰
export default async function handler(req, res) {
  try {
    res.setHeader('Cache-Control', 's-maxage=600')
    res.status(200).json(await getWeather())
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
