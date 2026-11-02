import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { fetchLegs, fetchOlle, fetchRoute, fetchSeason, fetchSpots, fetchWeather } from '../api/client'
import { spaceOf } from '../lib/space'
import { addFavorite, listFavorites, removeFavorite } from '../lib/reviews'

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

  // 챗 열기: 제안 카드의 "AI에게 더 물어보기" 가 질문을 미리 채워 챗을 연다 (자동으로 보내지는 않는다)
  chatDraft: null,
  askAi: (text) => set({ chatDraft: { text, at: Date.now() } }),

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
    supabase.auth.getSession().then(({ data }) => {
      set({ user: data.session?.user ?? null, authReady: true })
      if (data.session) get().loadFavs()
    })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null })
      if (!session) set({ favs: {} })
      else if (_event === 'SIGNED_IN') setTimeout(() => get().loadFavs(), 0) // 콜백 안에서 바로 요청하면 막힐 수 있어 한 박자 늦춘다
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
  // 계절 추천: 계절별(봄·여름·가을·겨울)과 "비·눈 오는 날"(rainy) 추천 12곳을 한 번씩 불러 둔다
  seasonName: null, // 고른 칩. 처음 열 때 지금 계절(비·눈이 오면 rainy)로 정한다
  seasonPicks: {},
  setSeasonName: (seasonName) => set({ seasonName }),
  loadSeason: async (name) => {
    if (get().seasonPicks[name]) return
    try {
      const { picks } = await fetchSeason(name)
      set({ seasonPicks: { ...get().seasonPicks, [name]: picks } })
    } catch {
      get().toast('추천을 불러오지 못했어요', 'danger')
    }
  },
  panelTab: 'places', // 'places' | 'plan' | 'season'
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
  // 추천 동선은 읽기 전용으로 따로 둔다. "이 동선으로 하기"를 눌러야 내 동선으로 복사된다.
  recPlan: { stops: [], legs: [] },
  planView: 'mine', // 'mine' | 'rec'
  setPlanView: (planView) => set({ planView }),
  generatePlan: async () => {
    set({ planBusy: true })
    try {
      const { stops, legs } = await fetchRoute(get().moodLevel)
      set({ recPlan: { stops, legs }, planView: 'rec', panelTab: 'plan' })
    } catch (e) {
      get().toast('동선을 만들지 못했어요. 잠시 후 다시 시도해 주세요', 'danger')
    } finally {
      set({ planBusy: false })
    }
  },
  adoptRecPlan: () => {
    const { stops, legs } = get().recPlan
    if (!stops.length) return
    get()._legToken = (get()._legToken || 0) + 1 // 진행 중인 이동시간 계산이 덮어쓰지 않게
    set({ plan: { stops: stops.map((s) => ({ ...s })), legs: [...legs] }, planView: 'mine' })
    get().toast('추천 동선을 내 동선으로 가져왔어요')
  },

  // 찜 — 본인만 (Supabase RLS). placeId → 행
  favs: {},
  loadFavs: async () => {
    if (!supabase || !get().user) return
    try {
      const rows = await listFavorites()
      set({ favs: Object.fromEntries(rows.map((r) => [r.place_id, r])) })
    } catch {
      /* 찜을 못 불러와도 나머지는 그대로 쓴다 */
    }
  },
  toggleFav: async ({ placeId, title, kind, address, lat, lng }) => {
    if (!supabase || !get().user) return get().toast('로그인하면 찜할 수 있어요', 'warning')
    const favs = { ...get().favs }
    try {
      if (favs[placeId]) {
        await removeFavorite(placeId)
        delete favs[placeId]
        get().toast('찜을 풀었어요')
      } else {
        favs[placeId] = await addFavorite({ placeId, title, kind, address, lat, lng })
        get().toast('찜했어요')
      }
      set({ favs })
    } catch (e) {
      get().toast(e.message, 'danger')
    }
  },
}))
