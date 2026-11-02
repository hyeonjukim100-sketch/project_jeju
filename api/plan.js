import { buildPlan, LIKE_NAMES, TRANSPORT, WALK, WHO } from '../server/plan.js'

// POST /api/plan { answers: { who, transport, walk, likes[] }, moodLevel } → 하루 코스 { stops, legs, intro, transport }
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST 만 받아요' })
  const a = req.body?.answers || {}
  const answers = {
    who: WHO.includes(a.who) ? a.who : null,
    transport: TRANSPORT.includes(a.transport) ? a.transport : 'car',
    walk: WALK.includes(a.walk) ? a.walk : 'some',
    likes: (Array.isArray(a.likes) ? a.likes : []).filter((l) => LIKE_NAMES.includes(l)).slice(0, 6),
  }
  const mood = Number(req.body?.moodLevel)
  try {
    res.status(200).json(await buildPlan(answers, Number.isInteger(mood) && mood >= 0 && mood <= 4 ? mood : 2))
  } catch (e) {
    console.error('plan error:', e.message)
    res.status(500).json({ error: '코스를 만들지 못했어요. 잠시 후 다시 시도해 주세요' })
  }
}
