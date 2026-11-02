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

export async function saveTrip({ date, entries, stops }) {
  const { data, error } = await need().from('trips').insert({ trip_date: date, entries, stops }).select().single()
  if (error) throw error
  return data
}

// 여행 기록 고치기: 날짜와 장소별 사진·글만 바꾼다 (정리: RLS 에 update 정책 필요, supabase/step10_trip_update.sql)
export async function updateTrip({ id, date, entries }) {
  const { data, error } = await need().from('trips').update({ trip_date: date, entries }).eq('id', id).select().single()
  if (error) throw error
  return data
}

// 지워지는 옛 사진 정리 (실패해도 기록 수정은 끝난 상태)
export async function removePhotos(paths) {
  if (paths.length) await need().storage.from(BUCKET).remove(paths)
}

export async function listTrips() {
  const { data, error } = await need().from('trips').select('*').order('trip_date', { ascending: false }).order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function deleteTrip(trip) {
  const paths = (trip.entries || []).map((e) => e.photo).filter(Boolean)
  const { error } = await need().from('trips').delete().eq('id', trip.id)
  if (error) throw error
  if (paths.length) await need().storage.from(BUCKET).remove(paths) // 사진도 함께 지운다 (실패해도 기록 삭제는 끝난 상태)
}

export async function listMyReviews() {
  const { data, error } = await need().from('place_reviews').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// 찜 (본인만)
export async function listFavorites() {
  const { data, error } = await need().from('favorites').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addFavorite({ placeId, title, kind, address, lat, lng }) {
  const row = { place_id: placeId, place_title: title, kind, address, lat, lng }
  const { data, error } = await need().from('favorites').insert(row).select().single()
  if (error?.code === '23505') return { ...row, created_at: new Date().toISOString() } // 이미 찜한 곳
  if (error) throw error
  return data
}

export async function removeFavorite(placeId) {
  const { error } = await need().from('favorites').delete().eq('place_id', placeId)
  if (error) throw error
}

// 여행 사진: 비공개 보관함에 <내 id>/<무작위>.jpg 로 올리고, 볼 때는 잠깐 유효한 주소를 받는다
const BUCKET = 'trip-photos'

// 긴 변 1280px, JPEG 0.82 로 줄여서 올린다 (저장 공간과 올리는 시간 절약)
async function shrink(file, max = 1280) {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height)
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('사진을 읽지 못했어요'))), 'image/jpeg', 0.82))
}

export async function uploadPhoto(file, userId) {
  const blob = await shrink(file)
  const path = `${userId}/${crypto.randomUUID()}.jpg`
  const { error } = await need().storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' })
  if (error) throw error
  return path
}

export async function photoUrls(paths) {
  const list = paths.filter(Boolean)
  if (!list.length) return {}
  const { data, error } = await need().storage.from(BUCKET).createSignedUrls(list, 3600)
  if (error) throw error
  return Object.fromEntries(data.filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]))
}
