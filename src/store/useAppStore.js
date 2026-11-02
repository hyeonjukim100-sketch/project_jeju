import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { fetchSpots, fetchWeather } from '../api/client'

// 로그인 오류를 읽기 쉬운 문장으로
const authMessage = (error) => {
  const m = `${error.code || ''} ${error.message || ''}`.toLowerCase()
  if (m.includes('invalid login')) return '이메일 또는 비밀번호가 맞지 않아요'
  if (m.includes('not confirmed')) return '이메일 인증을 먼저 완료해 주세요'
  if (m.includes('rate') || m.includes('security purposes')) return '잠시 후에 다시 시도해 주세요'
  if (m.includes('weak') || m.includes('password')) return '비밀번호를 8자 이상으로 정해 주세요'
  if (m.includes('already')) return '이미 가입된 이메일이에요'
  return error.message
}

// 여러 페이지가 함께 쓰는 상태. 한 화면에서만 쓰면 useState, 같이 쓰면 여기.
export const useAppStore = create((set, get) => ({
  // 알림: get().toast('메시지', 'success' | 'warning' | 'danger')
  toasts: [],
  toast: (message, variant = 'success') => {
    const id = Date.now() + Math.random()
    set({ toasts: [...get().toasts, { id, message, variant }] })
    setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 2500)
  },

  // 3D 지도에서 선택한 장소 (지도·동선·에이전트가 같이 봄)
  selectedSpot: null,
  selectSpot: (selectedSpot) => set({ selectedSpot }),

  // 오늘의 기분 (0 지침 ~ 4 활기). 점수로 저장하지 않고 화면에서만 쓴다.
  moodLevel: 2,
  setMoodLevel: (moodLevel) => set({ moodLevel }),

  // 관광지·날씨 (서버 /api 에서 한 번만 불러 옴)
  spots: [],
  weather: null,
  loadSpots: async () => {
    if (get().spots.length) return
    try {
      set({ spots: (await fetchSpots()).spots })
    } catch (e) {
      get().toast(`관광지를 불러오지 못했어요: ${e.message}`, 'danger')
    }
  },
  loadWeather: async () => {
    try {
      set({ weather: await fetchWeather() })
    } catch {
      /* 날씨가 없어도 지도는 보인다 */
    }
  },

  // 계정 — Supabase 이메일 가입·로그인 (기록 기능만 로그인이 필요하다)
  user: null,
  authReady: !supabase,
  initAuth: () => {
    if (!supabase) return () => {}
    supabase.auth.getSession().then(({ data }) => set({ user: data.session?.user ?? null, authReady: true }))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null })
      if (!session) set({ moodLogs: [] })
    })
    return () => data.subscription.unsubscribe()
  },
  signUp: async ({ email, password, nickname }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nickname }, emailRedirectTo: window.location.origin },
    })
    if (error) return { error: authMessage(error) }
    // 이미 가입된 이메일이면 Supabase 는 오류 대신 identities 가 빈 사용자를 돌려준다
    if (data.user && data.user.identities?.length === 0) return { error: '이미 가입된 이메일이에요' }
    return { needsConfirm: !data.session }
  },
  signIn: async ({ email, password }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? { error: authMessage(error) } : {}
  },
  signOut: async () => {
    await supabase.auth.signOut()
    get().toast('로그아웃했어요')
  },

  // 마음 기록 — 본인 것만 (Supabase RLS 가 막아 준다). mood 칸에는 이모지 이름만 저장한다.
  moodLogs: [],
  moodLoading: false,
  loadMoodLogs: async () => {
    if (!supabase || !get().user) return
    set({ moodLoading: true })
    const { data, error } = await supabase.from('mood_logs').select('*').order('created_at', { ascending: false })
    set({ moodLoading: false })
    if (error) return get().toast(error.message, 'danger')
    set({ moodLogs: data })
  },
  addMoodLog: async ({ emoji, note = '', place_title = null }) => {
    const user = get().user
    if (!supabase || !user) return get().toast('로그인하면 기록할 수 있어요', 'warning')
    const row = { nickname: user.user_metadata?.nickname || '익명', mood: emoji, note, place_title }
    const { data, error } = await supabase.from('mood_logs').insert(row).select().single()
    if (error) return get().toast(error.message, 'danger')
    set({ moodLogs: [data, ...get().moodLogs] })
    get().toast('마음을 기록했어요')
  },
  deleteMoodLog: async (id) => {
    const { error } = await supabase.from('mood_logs').delete().eq('id', id)
    if (error) return get().toast(error.message, 'danger')
    set({ moodLogs: get().moodLogs.filter((l) => l.id !== id) })
  },
}))
