import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { fetchLegs, fetchOlle, fetchRoute, fetchSpots, fetchWeather } from '../api/client'
import { spaceOf } from '../lib/space'

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
      set({ spots: (await fetchSpots()).spots.map((s) => ({ ...s, space: spaceOf(s) })) })
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

  // 하루 동선 — 직접 담거나 기분에 맞춰 만든다. 한 곳씩 쌓이고, 구간별 이동시간은 서버(OSRM)가 계산한다.
  plan: { stops: [], legs: [] },
  planBusy: false,
  // 올레길: 코스 정보는 API(odcloud) 카드로만 보여 준다 (지도 선은 꺼 둠, OlleLines.jsx)
  olle: [],
  selectedOlle: null, // 코스 번호 (예: '7', '7-1')
  loadOlle: async () => {
    if (get().olle.length) return
    try {
      set({ olle: (await fetchOlle()).courses })
    } catch {
      get().toast('올레코스를 불러오지 못했어요', 'danger')
    }
  },
  selectOlle: (selectedOlle) => set({ selectedOlle }),
  panelTab: 'places', // 'places' | 'plan'
  setPanelTab: (panelTab) => set({ panelTab }),
  _setStops: async (stops) => {
    const token = (get()._legToken = (get()._legToken || 0) + 1)
    set({ plan: { stops, legs: get().plan.legs.slice(0, Math.max(0, stops.length - 1)) } })
    if (stops.length < 2) return set({ plan: { stops, legs: [] } })
    try {
      const legs = await fetchLegs(stops.map(({ lat, lng }) => ({ lat, lng })))
      if (token === get()._legToken) set({ plan: { stops: get().plan.stops, legs } })
    } catch {
      if (token === get()._legToken) set({ plan: { stops: get().plan.stops, legs: [] } })
    }
  },
  addStop: (stop) => {
    const { stops } = get().plan
    if (stops.some((s) => s.title === stop.title)) return get().toast('이미 동선에 있어요', 'warning')
    if (stops.length >= 6) return get().toast('느린 하루는 여섯 곳까지만 담을 수 있어요', 'warning')
    get()._setStops([...stops, stop])
    get().toast('동선에 담았어요')
  },
  removeStop: (i) => get()._setStops(get().plan.stops.filter((_, idx) => idx !== i)),
  moveStop: (i, dir) => {
    const stops = [...get().plan.stops]
    const j = i + dir
    if (j < 0 || j >= stops.length) return
    ;[stops[i], stops[j]] = [stops[j], stops[i]]
    get()._setStops(stops)
  },
  clearPlan: () => get()._setStops([]),
  generatePlan: async () => {
    set({ planBusy: true })
    try {
      const { stops, legs } = await fetchRoute(get().moodLevel)
      set({ plan: { stops, legs }, panelTab: 'plan' })
    } catch (e) {
      get().toast('동선을 만들지 못했어요. 잠시 후 다시 시도해 주세요', 'danger')
    } finally {
      set({ planBusy: false })
    }
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
