import { legsOf } from '../server/route.js'

// POST /api/legs { points: [{lat, lng}] }  → 구간별 이동시간(분)·거리(km)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST 만 받아요' })
  const pts = Array.isArray(req.body?.points) ? req.body.points.slice(0, 10) : []
  const ok = pts.length >= 2 && pts.every((p) => Number(p.lat) > 33 && Number(p.lat) < 34 && Number(p.lng) > 126 && Number(p.lng) < 127.2)
  if (!ok) return res.status(400).json({ error: '제주 안의 두 곳 이상이 필요해요' })
  try {
    res.status(200).json({ legs: await legsOf(pts.map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) }))) })
  } catch (e) {
    console.error('legs error:', e.message)
    res.status(502).json({ error: '이동시간을 계산하지 못했어요' })
  }
}
