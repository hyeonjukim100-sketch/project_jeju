// 화면 → /api 서버 함수 호출 모음 (기능을 붙이면서 하나씩 추가)
async function get(path) {
  const r = await fetch(path)
  if (!r.ok) throw new Error(`${path} 요청 실패 (${r.status})`)
  return r.json()
}

export const hello = () => get('/api/hello')
export const fetchSpots = () => get('/api/spots')
export const fetchPhotos = ({ tourId, lat, lng }) =>
  get(tourId ? `/api/photos?id=${tourId}` : `/api/photos?lat=${lat}&lng=${lng}`)
export const fetchWeather = () => get('/api/weather')
export async function sendChat(messages, moodLevel) {
  const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages, moodLevel }) })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.error || '대화에 실패했어요')
  return data
}
