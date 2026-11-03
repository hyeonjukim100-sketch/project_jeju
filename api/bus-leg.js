import { getBusLeg } from '../server/busLeg.js'

// GET /api/bus-leg?fromLat=&fromLng=&toLat=&toLng=  → { options: [{ number, to, board, alight, stops, nextMin }] }
// 제주버스정보시스템 누리집이 쓰는 비공식 주소를 쓰므로 실패하면 빈 결과로 답하고, 화면이 안내 문구로 대신한다.
const inJeju = (lat, lng) => lat > 33 && lat < 34 && lng > 126 && lng < 127.2

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET 만 받아요' })
  const q = new URL(req.url, 'http://x').searchParams
  const [fromLat, fromLng, toLat, toLng] = ['fromLat', 'fromLng', 'toLat', 'toLng'].map((k) => (q.get(k) === null ? NaN : Number(q.get(k))))
  if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite) || !inJeju(fromLat, fromLng) || !inJeju(toLat, toLng)) {
    return res.status(400).json({ error: '제주 안의 두 곳 좌표가 필요해요' })
  }
  try {
    res.status(200).json(await getBusLeg({ lat: fromLat, lng: fromLng }, { lat: toLat, lng: toLng }))
  } catch (e) {
    console.error('bus-leg error:', String(e.message).slice(0, 120))
    res.status(200).json({ options: [] })
  }
}
