// 화면 → /api 서버 함수 호출 모음 (기능을 붙이면서 하나씩 추가)
async function get(path) {
  const r = await fetch(path)
  if (!r.ok) throw new Error(`${path} 요청 실패 (${r.status})`)
  return r.json()
}

export const hello = () => get('/api/hello')
export const fetchSpots = () => get('/api/spots')
export const fetchPhotos = ({ tourId, title, lat, lng }) =>
  get(`/api/photos?${tourId ? `id=${tourId}&` : ''}title=${encodeURIComponent(title)}&lat=${lat}&lng=${lng}`)
export const fetchWeather = () => get('/api/weather')
export async function sendChat(messages, moodLevel) {
  const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages, moodLevel }) })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.error || '대화에 실패했어요')
  return data
}
export const fetchRoute = (mood) => get(`/api/route?mood=${mood}`)
export const fetchPlaces = ({ lat, lng, category }) => get(`/api/places?lat=${lat}&lng=${lng}&category=${category}`)
export async function fetchLegs(points) {
  const r = await fetch('/api/legs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ points }) })
  if (!r.ok) throw new Error('이동시간을 계산하지 못했어요')
  return (await r.json()).legs
}
export const fetchBusLeg = (from, to) => get(`/api/bus-leg?fromLat=${from.lat}&fromLng=${from.lng}&toLat=${to.lat}&toLng=${to.lng}`)
export const fetchOlle = () => get('/api/olle')
export const fetchSeason = (name) => get(`/api/season?name=${name}`)
export async function fetchPlan(answers, moodLevel) {
  const r = await fetch('/api/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers, moodLevel }) })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.error || '코스를 만들지 못했어요')
  return data
}
