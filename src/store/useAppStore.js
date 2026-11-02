import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import { fetchSpots, fetchWeather } from '../api/client'

// 여러 페이지가 함께 쓰는 상태. 한 화면에서만 쓰면 useState, 같이 쓰면 여기.
export const useAppStore = create(
  persist(
    (set, get) => ({
      // 사용자 (새로고침해도 유지)
      nickname: '',
      setNickname: (nickname) => set({ nickname: nickname.trim() }),

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

      // 마음 기록 — Supabase mood_logs 테이블과 동기화
      moodLogs: [],
      moodLoading: false,
      loadMoodLogs: async () => {
        if (!supabase) return get().toast('Supabase 설정(.env.local)이 필요해요', 'warning')
        set({ moodLoading: true })
        const { data, error } = await supabase
          .from('mood_logs').select('*')
          .eq('nickname', get().nickname || '익명')
          .order('created_at', { ascending: false })
        set({ moodLoading: false })
        if (error) return get().toast(error.message, 'danger')
        set({ moodLogs: data })
      },
      addMoodLog: async ({ mood, note = '', place_title = null }) => {
        if (!supabase) return get().toast('Supabase 설정(.env.local)이 필요해요', 'warning')
        const row = { nickname: get().nickname || '익명', mood, note, place_title }
        const { data, error } = await supabase.from('mood_logs').insert(row).select().single()
        if (error) return get().toast(error.message, 'danger')
        set({ moodLogs: [data, ...get().moodLogs] })
        get().toast('마음을 기록했어요')
      },
    }),
    {
      name: 'jeju-ip-3d-store',
      partialize: (s) => ({ nickname: s.nickname }),
    },
  ),
)
