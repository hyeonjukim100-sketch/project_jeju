import { runAgent } from '../server/agent.js'
import { CRISIS_CONTACTS, hasCrisisSignal } from '../src/lib/crisis.js'
import { clientIp, createLimiter } from '../server/rateLimit.js'

// POST /api/chat  { messages: [{role, content}], moodLevel }
// 위험 문구는 모델을 부르기 전에 서버가 먼저 점검하고, 걸리면 코스 대신 연락처 안내만 돌려준다.
const MAX_MESSAGES = 12
const MAX_CHARS = 500
// 한 사람이 1분에 15번, 한 시간에 100번까지. AI 호출은 비용이 들어서 시간당 한도를 따로 둔다 (인스턴스마다 따로 세는 간단한 방어)
const perMinute = createLimiter(15)
const perHour = createLimiter(100, 3_600_000)
const tooMany = (ip) => perMinute(ip) || perHour(ip)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST 만 받아요' })
  if (tooMany(clientIp(req))) return res.status(429).json({ error: '잠시 후에 다시 말씀해 주세요' })

  const body = req.body || {}
  const raw = Array.isArray(body.messages) ? body.messages.slice(-MAX_MESSAGES) : []
  const messages = raw
    .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }))
  const last = messages.at(-1)
  if (!last || last.role !== 'user') return res.status(400).json({ error: '보낼 말이 없어요' })

  if (hasCrisisSignal(last.content)) {
    return res.status(200).json({
      crisis: true,
      reply: '지금 마음이 많이 무거우신가요? 혼자 견디지 않으셔도 괜찮아요. 따뜻하게 들어 줄 분들이 언제든 기다리고 있어요 🌿',
      contacts: CRISIS_CONTACTS,
    })
  }

  const moodLevel = Number.isInteger(body.moodLevel) ? Math.min(4, Math.max(0, body.moodLevel)) : 2
  try {
    const out = await runAgent({ messages, moodLevel })
    if (out.unavailable) return res.status(503).json({ error: 'AI 가이드가 아직 준비되지 않았어요' })
    res.status(200).json({ reply: out.reply })
  } catch (e) {
    console.error('chat error:', e.status || '', String(e.message).slice(0, 200))
    if (e.status === 429) return res.status(429).json({ error: '지금은 대화가 많아 잠시 쉬고 있어요. 1분쯤 뒤에 다시 말씀해 주세요' })
    res.status(500).json({ error: '지금은 답을 가져오지 못했어요. 잠시 후 다시 시도해 주세요' })
  }
}
