import { supabase } from './supabase'

// 리뷰·여행 기록 데이터 접근 (Supabase). 읽기는 누구나(리뷰), 쓰기는 로그인한 본인만 — RLS 가 막아 준다.
const need = () => {
  if (!supabase) throw new Error('Supabase 설정(.env.local)이 필요해요')
  return supabase
}

export async function listReviews(placeId) {
  const { data, error } = await need().from('place_reviews').select('*').eq('place_id', placeId).order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// 여러 장소의 평균 별점: { [placeId]: { avg, count } }
export async function ratingsFor(placeIds) {
  if (!placeIds.length) return {}
  const { data, error } = await need().from('place_reviews').select('place_id, rating').in('place_id', placeIds)
  if (error) throw error
  const acc = {}
  for (const r of data) {
    if (!r.rating) continue
    const a = (acc[r.place_id] ||= { sum: 0, count: 0 })
    a.sum += r.rating
    a.count += 1
  }
  return Object.fromEntries(Object.entries(acc).map(([id, a]) => [id, { avg: Math.round((a.sum / a.count) * 10) / 10, count: a.count }]))
}

// 한 사람이 한 장소에 하나: 있으면 고친다
export async function saveReview({ placeId, title, rating, body, tags, nickname }) {
  const row = { place_id: placeId, place_title: title, rating, body, tags, nickname }
  const { data, error } = await need().from('place_reviews').upsert(row, { onConflict: 'user_id,place_id' }).select().single()
  if (error) throw error
  return data
}

export async function deleteReview(id) {
  const { error } = await need().from('place_reviews').delete().eq('id', id)
  if (error) throw error
}

export async function saveTrip({ mood, note, tags, stops }) {
  const { data, error } = await need().from('trips').insert({ mood, note, tags, stops }).select().single()
  if (error) throw error
  return data
}

export async function listTrips() {
  const { data, error } = await need().from('trips').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function deleteTrip(id) {
  const { error } = await need().from('trips').delete().eq('id', id)
  if (error) throw error
}
