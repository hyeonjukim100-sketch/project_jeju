import { buildPlan, LIKE_NAMES, TRANSPORT, WALK, WHO } from '../server/plan.js'
import { clientIp, createLimiter } from '../server/rateLimit.js'

// POST /api/plan { answers: { who, transport, walk, likes[] }, moodLevel } → 하루 코스 { stops, legs, intro, transport }
const tooMany = createLimiter(10) // 같은 IP 에서 1분에 10번까지 (코스 만들기는 외부 API 를 여러 번 부른다)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST 만 받아요' })
  if (tooMany(clientIp(req))) return res.status(429).json({ error: '잠시 후에 다시 만들어 주세요' })
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
