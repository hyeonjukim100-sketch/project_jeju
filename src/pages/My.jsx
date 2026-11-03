import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthForm from '../components/AuthForm'
import CitrusRating from '../components/CitrusRating'
import Emoji from '../components/Emoji'
import { moodChangeText, moodOf } from '../lib/moods'
import { deleteReview, deleteTrip, listMyReviews, listTrips, photoUrls } from '../lib/reviews'
import { isSupabaseReady } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

const TABS = [
  { key: 'trips', label: '여행 기록' },
  { key: 'reviews', label: '내 리뷰' },
  { key: 'favs', label: '찜한 곳' },
]

// 리뷰·찜에서 그 장소의 설명(지도 화면의 장소 상세)으로 이어 준다. 관광지 목록에 없는 곳(근처 식당·카페)은 연결하지 않는다.
function usePlaceLink() {
  const spots = useAppStore((s) => s.spots)
  const loadSpots = useAppStore((s) => s.loadSpots)
  const selectSpot = useAppStore((s) => s.selectSpot)
  const setPanelTab = useAppStore((s) => s.setPanelTab)
  const navigate = useNavigate()
  useEffect(() => {
    loadSpots()
  }, [])
  const find = (placeId, title) => spots.find((x) => x.id === placeId) || spots.find((x) => x.title === title)
  const open = (spot) => {
    selectSpot(spot)
    setPanelTab('places')
    navigate('/#explore')
  }
  return { find, open }
}

function PlaceLink({ link, placeId, title }) {
  const spot = link.find(placeId, title)
  if (!spot && placeId?.startsWith('kakao:')) {
    return (
      <a className="chip place-link text-decoration-none" href={`https://place.map.kakao.com/${placeId.slice(6)}`} target="_blank" rel="noreferrer">
        카카오맵 <i className="bi bi-box-arrow-up-right" />
      </a>
    )
  }
  if (!spot) return null
  return (
    <button type="button" className="chip place-link" onClick={() => link.open(spot)}>
      설명 보기 <i className="bi bi-chevron-right" />
    </button>
  )
}

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
    <>
    <p className="privacy-note">
      <i className="bi bi-lock" aria-hidden="true" />
      <span>여행 기록은 나만 볼 수 있어요. 다른 이용자에게는 보이지 않아요.</span>
    </p>
    <ul className="diary-list">
      {trips.map((t) => {
        const d = new Date(`${t.trip_date}T00:00:00`)
        const entries = t.entries?.length ? t.entries : t.stops.map((s) => ({ title: s.title }))
        return (
          <li key={t.id} className="diary">
            <header className="diary-head">
              <span className="diary-day">{d.getDate()}</span>
              <span className="diary-when">
                <span>{d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}</span>
                <span>{d.toLocaleDateString('ko-KR', { weekday: 'long' })}</span>
              </span>
              <span className="diary-count">{entries.length}곳을 다녀왔어요</span>
              <Link to={`/trip/new?edit=${t.id}`} className="chip text-decoration-none" aria-label="이 여행 기록 고치기">
                수정
              </Link>
              <button type="button" className="chip" onClick={() => remove(t)} aria-label="이 여행 기록 지우기">
                지우기
              </button>
            </header>
            {(moodOf(t.mood_before) || moodOf(t.mood_after)) && (
              <div className="diary-mood" role="img" aria-label={`이 여행의 기분: ${moodChangeText(t.mood_before, t.mood_after)}`}>
                {moodOf(t.mood_before) && <Emoji name={t.mood_before} size="1.4rem" />}
                {moodOf(t.mood_before) && moodOf(t.mood_after) && <i className="bi bi-arrow-right" aria-hidden="true" />}
                {moodOf(t.mood_after) && <Emoji name={t.mood_after} size="1.4rem" />}
                <span>{moodChangeText(t.mood_before, t.mood_after)}</span>
              </div>
            )}
            <ol className="diary-pages">
              {entries.map((e, i) => (
                <li key={i} className="diary-page">
                  {i > 0 && (
                    <div className="diary-way" aria-hidden="true">
                      <Emoji name="footprints" size="1em" />
                    </div>
                  )}
                  <div className="diary-place">
                    <span className="season-no">{i + 1}</span> {e.title}
                  </div>
                  {e.photo && urls[e.photo] && (
                    <figure className="diary-photo">
                      <img src={urls[e.photo]} alt={`${e.title} 사진`} loading="lazy" />
                    </figure>
                  )}
                  {e.text && <p className="diary-text">{e.text}</p>}
                </li>
              ))}
            </ol>
          </li>
        )
      })}
    </ul>
    </>
  )
}

// 내가 남긴 리뷰
function MyReviews({ userId }) {
  const [rows, setRows] = useState(null)
  const toast = useAppStore((s) => s.toast)
  const link = usePlaceLink()
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
            <PlaceLink link={link} placeId={r.place_id} title={r.place_title} />
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
  const link = usePlaceLink()
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
          <PlaceLink link={link} placeId={f.place_id} title={f.place_title} />
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
      <div className="page-stub auth-stub">
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
