import { Link, useNavigate } from 'react-router-dom'
import { isSupabaseReady } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

// 내 동선 아래 버튼: 동선의 장소마다 사진과 글을 남기는 여행 기록 페이지로 간다
export default function TripRecord() {
  const user = useAppStore((s) => s.user)
  const stops = useAppStore((s) => s.plan.stops)
  const navigate = useNavigate()

  if (!isSupabaseReady || stops.length === 0) return null
  if (!user) {
    return (
      <p className="small text-secondary mt-3">
        <Link to="/my">로그인</Link>하면 이 동선으로 여행 기록을 남길 수 있어요.
      </p>
    )
  }
  return (
    <button type="button" className="btn-soft w-100 mt-3" onClick={() => navigate('/trip/new')}>
      이 동선으로 여행 기록 남기기
    </button>
  )
}
