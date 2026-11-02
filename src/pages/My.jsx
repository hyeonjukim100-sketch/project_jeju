import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AuthForm from '../components/AuthForm'
import CitrusRating from '../components/CitrusRating'
import { deleteReview, deleteTrip, listMyReviews, listTrips, photoUrls } from '../lib/reviews'
import { isSupabaseReady } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

const TABS = [
  { key: 'trips', label: '여행 기록' },
  { key: 'reviews', label: '내 리뷰' },
  { key: 'favs', label: '찜한 곳' },
]

// 하루 여행 기록: 날짜, 장소별 사진과 글 (본인만 보인다)
function Trips({ userId }) {
  const [trips, setTrips] = useState(null)
  const [urls, setUrls] = useState({})
  const toast = useAppStore((s) => s.toast)

  useEffect(() => {
    listTrips()
      .then(async (rows) => {
        setTrips(rows)
        setUrls(await photoUrls(rows.flatMap((t) => (t.entries || []).map((e) => e.photo))).catch(() => ({})))
      })
      .catch(() => setTrips([]))
  }, [userId])

  const remove = async (t) => {
    if (!window.confirm('이 여행 기록을 지울까요? 사진도 함께 지워져요.')) return
    try {
      await deleteTrip(t)
      setTrips((list) => list.filter((x) => x.id !== t.id))
    } catch (e) {
      toast(e.message, 'danger')
    }
  }

  if (!trips) return <p className="text-secondary">불러오는 중…</p>
  if (trips.length === 0) {
    return (
      <p className="text-secondary">
        아직 여행 기록이 없어요. <Link to="/#explore">지도</Link>에서 하루 동선을 만든 뒤 “이 동선으로 여행 기록 남기기”를 눌러 보세요.
      </p>
    )
  }
  return (
    <ul className="log-list">
      {trips.map((t) => (
        <li key={t.id} className="trip-card">
          <div className="d-flex align-items-center gap-2 mb-2">
            <strong className="flex-grow-1">{new Date(`${t.trip_date}T00:00:00`).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
            <button type="button" className="chip" onClick={() => remove(t)} aria-label="이 여행 기록 지우기">
              지우기
            </button>
          </div>
          <ol className="trip-read">
            {(t.entries?.length ? t.entries : t.stops.map((s) => ({ title: s.title }))).map((e, i) => (
              <li key={i}>
                <div className="fw-semibold">
                  <span className="season-no">{i + 1}</span> {e.title}
                </div>
                {e.photo && urls[e.photo] && <img className="trip-img" src={urls[e.photo]} alt={`${e.title} 사진`} loading="lazy" />}
                {e.text && <p className="mb-0">{e.text}</p>}
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ul>
  )
}

// 내가 남긴 리뷰
function MyReviews({ userId }) {
  const [rows, setRows] = useState(null)
  const toast = useAppStore((s) => s.toast)
  useEffect(() => {
    listMyReviews().then(setRows).catch(() => setRows([]))
  }, [userId])

  if (!rows) return <p className="text-secondary">불러오는 중…</p>
  if (rows.length === 0) return <p className="text-secondary">아직 남긴 리뷰가 없어요. 장소 상세에서 감귤 별점과 한마디를 남겨 보세요.</p>
  return (
    <ul className="log-list">
      {rows.map((r) => (
        <li key={r.id} className="trip-card">
          <div className="d-flex align-items-center gap-2">
            <strong className="flex-grow-1">{r.place_title}</strong>
            <button
              type="button"
              className="chip"
              onClick={async () => {
                try {
                  await deleteReview(r.id)
                  setRows((l) => l.filter((x) => x.id !== r.id))
                } catch (e) {
                  toast(e.message, 'danger')
                }
              }}
            >
              지우기
            </button>
          </div>
          {r.rating && <CitrusRating value={r.rating} size="1rem" />}
          {r.body && <p className="mb-1 mt-1">{r.body}</p>}
          {r.tags?.length > 0 && <div className="review-tags">{r.tags.map((x) => `#${x}`).join(' ')}</div>}
        </li>
      ))}
    </ul>
  )
}

// 찜한 곳
function Favs() {
  const favs = useAppStore((s) => s.favs)
  const toggleFav = useAppStore((s) => s.toggleFav)
  const rows = Object.values(favs).sort((a, b) => b.created_at.localeCompare(a.created_at))
  if (rows.length === 0) return <p className="text-secondary">아직 찜한 곳이 없어요. 장소 카드의 하트(찜) 버튼을 눌러 보세요.</p>
  return (
    <ul className="log-list">
      {rows.map((f) => (
        <li key={f.place_id} className="log-item">
          <i className="bi bi-heart-fill fav-icon" />
          <div className="flex-grow-1">
            <strong>{f.place_title}</strong>
            <div className="small text-secondary">{[f.kind, f.address].filter(Boolean).join(' · ')}</div>
          </div>
          <button type="button" className="chip" onClick={() => toggleFav({ placeId: f.place_id, title: f.place_title })}>
            찜 풀기
          </button>
        </li>
      ))}
    </ul>
  )
}

// 나의 여행 기록: 로그인한 본인만 자기 여행 기록·리뷰·찜을 본다
export default function My() {
  const { user, authReady, signOut } = useAppStore()
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'trips'

  if (!isSupabaseReady) {
    return (
      <div className="page-stub">
        <h1 className="h3">나의 여행 기록</h1>
        <p className="text-secondary">.env.local 에 Supabase 값이 아직 없어요.</p>
      </div>
    )
  }
  if (!authReady) return <div className="page-stub text-secondary">잠시만요…</div>
  if (!user) {
    return (
      <div className="page-stub">
        <h1 className="h3 mb-3">나의 여행 기록</h1>
        <AuthForm />
      </div>
    )
  }

  const name = user.user_metadata?.nickname || user.email

  return (
    <div className="page-stub">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h3 mb-0">{name}님의 여행 기록</h1>
        <button type="button" className="chip" onClick={signOut}>
          로그아웃
        </button>
      </div>
      <div className="kind-chips mb-3" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={t.key === tab} className={`chip ${t.key === tab ? 'on' : ''}`} onClick={() => setParams({ tab: t.key })}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'trips' && <Trips userId={user.id} />}
      {tab === 'reviews' && <MyReviews userId={user.id} />}
      {tab === 'favs' && <Favs />}
    </div>
  )
}
