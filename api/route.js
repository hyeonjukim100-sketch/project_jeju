import { buildRoute } from '../server/route.js'

// GET /api/route?mood=0~4 → 기분에 맞춘 하루 동선 { stops, legs }
export default async function handler(req, res) {
  try {
    const mood = Number(new URL(req.url, 'http://x').searchParams.get('mood'))
    res.status(200).json(await buildRoute(Number.isInteger(mood) && mood >= 0 && mood <= 4 ? mood : 2))
  } catch (e) {
    console.error('route error:', e.message)
    res.status(500).json({ error: '동선을 만들지 못했어요. 잠시 후 다시 시도해 주세요' })
  }
}
