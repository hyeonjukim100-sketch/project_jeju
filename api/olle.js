import { getOlleCourses } from '../server/olle.js'

// GET /api/olle → 올레코스 목록 [{id, name, km, time, route}]
export default async function handler(req, res) {
  try {
    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate')
    res.status(200).json({ courses: await getOlleCourses() })
  } catch (e) {
    console.error('olle error:', e.message)
    res.status(500).json({ error: '올레코스를 불러오지 못했어요' })
  }
}
