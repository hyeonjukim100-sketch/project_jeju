// Vercel 서버 함수 동작 확인용 (/api/hello)
export default function handler(req, res) {
  res.status(200).json({ ok: true, app: 'jeju-culture-ip-3d', time: new Date().toISOString() })
}
