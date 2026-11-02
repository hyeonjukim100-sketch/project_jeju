import { SEASON_NAMES, getSeasonPicks } from '../server/season.js'

// GET /api/season?name=spring|summer|autumn|winter|rainy → 그 계절(또는 비·눈 오는 날)에 가기 좋은 12곳
export default async function handler(req, res) {
  try {
    const name = new URL(req.url, 'http://x').searchParams.get('name')
    if (!SEASON_NAMES.includes(name)) return res.status(400).json({ error: `name 은 ${SEASON_NAMES.join('|')} 중 하나` })
    res.setHeader('Cache-Control', 's-maxage=1800')
    res.status(200).json({ name, picks: await getSeasonPicks(name) })
  } catch (e) {
    console.error('season error:', e.message)
    res.status(500).json({ error: '추천을 불러오지 못했어요' })
  }
}
