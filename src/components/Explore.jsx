import { useEffect, useMemo, useState } from 'react'
import JejuMap3D from './JejuMap3D'
import WeatherStrip from './WeatherStrip'
import Emoji from './Emoji'
import CitrusRating from './CitrusRating'
import ReviewBox from './ReviewBox'
import TripRecord from './TripRecord'
import { fetchPhotos, fetchPlaces } from '../api/client'
import { ratingsFor } from '../lib/reviews'
import { isSupabaseReady } from '../lib/supabase'
import { KIND_EMOJI, MOOD_LEVELS } from '../lib/moods'
import { useAppStore } from '../store/useAppStore'

const START_MIN = 10 * 60 // 하루는 10:00 에 시작한다고 보고 예상 시각을 계산한다
const STAY = { spot: 60, rest: 40 } // 머무는 시간(분): 구경 60, 쉬어가기 40
const LONG_LEG = 35 // 느린 일정: 한 구간 이동은 35분 안쪽
const clock = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

function Gallery({ spot }) {
  const { title } = spot
  const [photos, setPhotos] = useState(null)
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    setPhotos(null)
    setIdx(0)
    fetchPhotos(spot).then((r) => setPhotos(r.photos)).catch(() => setPhotos([]))
  }, [spot.id])

  if (photos === null) return <div className="gallery-empty">사진을 찾는 중…</div>
  if (!photos.length) return <div className="gallery-empty">이곳의 사진은 아직 없어요</div>
  return (
    <div>
      <img className="gallery-main" src={photos[idx].url} alt={title} loading="lazy" />
      <div className="gallery-thumbs">
        {photos.map((p, i) => (
          <img key={p.url} src={p.url} alt="" className={i === idx ? 'on' : ''} onClick={() => setIdx(i)} loading="lazy" />
        ))}
      </div>
      <div className="small text-secondary mt-1">
        사진: {photos[idx].credit} ({photos[idx].source})
      </div>
    </div>
  )
}

// 근처 카페·식당 (카카오 로컬) — 별점·분위기 정보는 없어서 이름·분류·거리만 보여 준다
function Nearby({ spot }) {
  const addStop = useAppStore((s) => s.addStop)
  const [cat, setCat] = useState(null)
  const [list, setList] = useState(null)
  const [ratings, setRatings] = useState({})
  const [good, setGood] = useState(false) // 앱 안 리뷰 평균 3.5 이상만
  const [openId, setOpenId] = useState(null)
  useEffect(() => {
    setCat(null)
    setList(null)
    setRatings({})
    setOpenId(null)
  }, [spot.id])

  const load = (category) => {
    setCat(category)
    setList(null)
    setRatings({})
    fetchPlaces({ lat: spot.lat, lng: spot.lng, category })
      .then((r) => {
        setList(r.places)
        if (isSupabaseReady) ratingsFor(r.places.map((p) => `kakao:${p.id}`)).then(setRatings).catch(() => {})
      })
      .catch(() => setList([]))
  }

  const rated = (p) => ratings[`kakao:${p.id}`]
  const shown = list ? (good ? list.filter((p) => rated(p)?.avg >= 3.5) : list) : []

  return (
    <div className="nearby">
      <div className="kind-chips">
        <button type="button" className={`chip ${cat === 'CE7' ? 'on' : ''}`} onClick={() => load('CE7')}>
          <Emoji name="coffee" size="1.15em" /> 근처 카페
        </button>
        <button type="button" className={`chip ${cat === 'FD6' ? 'on' : ''}`} onClick={() => load('FD6')}>
          <Emoji name="food" size="1.15em" /> 근처 식당
        </button>
        {list && list.length > 0 && (
          <button type="button" aria-pressed={good} className={`chip ${good ? 'on' : ''}`} onClick={() => setGood((g) => !g)}>
            <Emoji name="tangerine" size="1.15em" /> 3.5 이상만
          </button>
        )}
      </div>
      {cat && list === null && <div className="small text-secondary mt-2">찾는 중…</div>}
      {list && list.length === 0 && <div className="small text-secondary mt-2">가까운 곳을 찾지 못했어요</div>}
      {good && list && list.length > 0 && shown.length === 0 && (
        <div className="small text-secondary mt-2">아직 감귤 3.5 이상인 곳이 없어요. 다녀오신 곳에 리뷰를 남겨 주세요.</div>
      )}
      {shown.length > 0 && (
        <ul className="nearby-list">
          {shown.map((p) => (
            <li key={p.id} className="nearby-item">
              <div className="nearby-row">
                <div className="flex-grow-1">
                  <a href={p.url} target="_blank" rel="noreferrer">
                    {p.title}
                  </a>
                  <div className="small text-secondary">
                    {p.category} · {p.distance}m
                  </div>
                  {rated(p) && (
                    <div className="small">
                      <CitrusRating value={rated(p).avg} size="1rem" /> {rated(p).avg.toFixed(1)} ({rated(p).count})
                    </div>
                  )}
                </div>
                <div className="nearby-ctl">
                  <button type="button" className="chip" onClick={() => addStop({ type: 'rest', title: p.title, kind: p.category, address: p.address, lat: p.lat, lng: p.lng, url: p.url })}>
                    담기
                  </button>
                  <button type="button" className="chip" aria-expanded={openId === p.id} onClick={() => setOpenId(openId === p.id ? null : p.id)}>
                    리뷰
                  </button>
                </div>
              </div>
              {openId === p.id && <ReviewBox placeId={`kakao:${p.id}`} title={p.title} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PlanTab({ spots }) {
  const { plan, planBusy, generatePlan, removeStop, moveStop, clearPlan, selectSpot, setPanelTab } = useAppStore()
  const { stops, legs } = plan

  // 예상 시각: 시작 + (머문 시간 + 이동시간) 을 차례로 더한다
  const etas = useMemo(() => {
    let t = START_MIN
    return stops.map((s, i) => {
      const at = t
      t += STAY[s.type] + (legs[i]?.minutes ?? 0)
      return at
    })
  }, [stops, legs])
  const driveTotal = legs.reduce((a, l) => a + l.minutes, 0)
  const endAt = stops.length ? etas.at(-1) + STAY[stops.at(-1).type] : START_MIN

  const open = (s) => {
    const spot = spots.find((x) => x.title === s.title)
    if (spot) {
      selectSpot(spot)
      setPanelTab('places')
    }
  }

  return (
    <>
      <button type="button" className="btn-soft w-100" onClick={generatePlan} disabled={planBusy}>
        {planBusy ? '동선을 만드는 중…' : stops.length ? '다시 만들기' : '오늘 기분에 맞는 하루 동선 만들기'}
      </button>
      <p className="small text-secondary mt-2">핀을 눌러 “동선에 담기”로 직접 짤 수도 있어요. 규칙으로 고른 추천이라 마음에 안 들면 다시 만들어 보세요.</p>

      {stops.length === 0 ? (
        <p className="small text-secondary mb-0">아직 비어 있어요.</p>
      ) : (
        <>
          <ol className="plan-list">
            {stops.map((s, i) => (
              <li key={`${s.title}-${i}`}>
                <div className="plan-row">
                  <span className="plan-no">{i + 1}</span>
                  <div className="flex-grow-1">
                    <div className="plan-time">
                      {clock(etas[i])} · {s.type === 'rest' ? '쉬어가기' : '구경'} {STAY[s.type]}분
                    </div>
                    <button type="button" className="plan-title" onClick={() => open(s)}>
                      <Emoji name={s.type === 'rest' ? 'coffee' : KIND_EMOJI[s.kind] || 'pin'} size="1.1em" /> {s.title}
                    </button>
                    <div className="small text-secondary">{s.kind}</div>
                  </div>
                  <div className="plan-ctl">
                    <button type="button" className="chip" onClick={() => moveStop(i, -1)} aria-label="위로" disabled={i === 0}>
                      <i className="bi bi-arrow-up" />
                    </button>
                    <button type="button" className="chip" onClick={() => moveStop(i, 1)} aria-label="아래로" disabled={i === stops.length - 1}>
                      <i className="bi bi-arrow-down" />
                    </button>
                    <button type="button" className="chip" onClick={() => removeStop(i)} aria-label="동선에서 빼기">
                      <i className="bi bi-x-lg" />
                    </button>
                  </div>
                </div>
                {i < stops.length - 1 && (
                  <div className={`plan-leg ${legs[i]?.minutes > LONG_LEG ? 'long' : ''}`}>
                    {legs[i] ? (
                      <>
                        <i className="bi bi-car-front" /> 차로 약 {legs[i].minutes}분 <small>({legs[i].km}km){legs[i].minutes > LONG_LEG && ' · 조금 멀어요'}</small>
                      </>
                    ) : (
                      '이동시간 계산 중…'
                    )}
                  </div>
                )}
              </li>
            ))}
          </ol>
          <div className="plan-sum">
            총 {stops.length}곳 · 이동 {driveTotal}분 · {clock(START_MIN)}에 시작하면 {clock(endAt)}쯤 마쳐요
            <div className="small text-secondary">이동시간은 자동차 기준 예상이고, 머무는 시간은 구경 60분·쉬어가기 40분으로 계산했어요.</div>
          </div>
          <button type="button" className="chip" onClick={clearPlan}>
            동선 비우기
          </button>
          <TripRecord />
        </>
      )}
    </>
  )
}

// 스크롤하면 나오는 화면: 날씨 → 3D 지도 + 하루 동선
export default function Explore() {
  const { spots, weather, selectedSpot: spot, moodLevel, plan, panelTab, setPanelTab, addStop, loadSpots, loadWeather } = useAppStore()
  const [kind, setKind] = useState('전체')
  const [folded, setFolded] = useState(false) // 모바일: 시트를 접어 지도를 넓게 본다

  useEffect(() => {
    loadSpots()
    loadWeather()
  }, [])

  const kinds = useMemo(() => ['전체', '사진 있는 곳', ...new Set(spots.map((s) => s.kind).filter(Boolean))], [spots])
  const shown = useMemo(
    () => (kind === '전체' ? spots : kind === '사진 있는 곳' ? spots.filter((s) => s.tourId) : spots.filter((s) => s.kind === kind)),
    [spots, kind],
  )
  const mood = MOOD_LEVELS[moodLevel]

  return (
    <section id="explore" className="explore">
      <WeatherStrip w={weather} />
      <div className="map-stage">
        <JejuMap3D spots={shown} weather={weather} />
        <aside className={`glass-panel ${panelTab === 'plan' || spot ? 'tall' : ''} ${folded ? 'folded' : ''}`}>
          <button type="button" className="sheet-toggle" onClick={() => setFolded((f) => !f)} aria-expanded={!folded} aria-label={folded ? '패널 펼치기' : '패널 접고 지도 보기'}>
            <i className={`bi bi-chevron-${folded ? 'up' : 'down'}`} /> {folded ? '펼치기' : '지도 보기'}
          </button>
          <div className="panel-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={panelTab === 'places'} className={panelTab === 'places' ? 'on' : ''} onClick={() => setPanelTab('places')}>
              장소
            </button>
            <button type="button" role="tab" aria-selected={panelTab === 'plan'} className={panelTab === 'plan' ? 'on' : ''} onClick={() => setPanelTab('plan')}>
              하루 동선{plan.stops.length > 0 && ` ${plan.stops.length}`}
            </button>
          </div>

          {panelTab === 'plan' ? (
            <PlanTab spots={spots} />
          ) : spot ? (
            <>
              <div className="panel-kicker">
                {KIND_EMOJI[spot.kind] && <Emoji name={KIND_EMOJI[spot.kind]} size="1.1em" />} {spot.kind}
              </div>
              <h2 className="panel-title">{spot.title}</h2>
              <div className="small text-secondary mb-2">{spot.address}</div>
              <button
                type="button"
                className="btn-soft mb-2"
                onClick={() => addStop({ type: 'spot', title: spot.title, kind: spot.kind, address: spot.address, lat: spot.lat, lng: spot.lng, tourId: spot.tourId || null })}
              >
                동선에 담기
              </button>
              <Gallery spot={spot} />
              <Nearby spot={spot} />
              <p className="spot-intro">{spot.intro}</p>
              <ReviewBox placeId={spot.id} title={spot.title} />
            </>
          ) : (
            <>
              <h2 className="panel-title">느린 제주 마음지도</h2>
              <p className="small text-secondary mb-2">
                섬을 돌려 보고 핀을 눌러 보세요. 관광지 {spots.length ? `${shown.length}곳` : '불러오는 중…'}
              </p>
              <div className="mood-pill">
                <Emoji name={mood.emoji} size="1.3em" /> 오늘은 “{mood.label}”
              </div>
              <div className="kind-chips">
                {kinds.map((k) => (
                  <button key={k} type="button" className={`chip ${k === kind ? 'on' : ''}`} onClick={() => setKind(k)}>
                    {KIND_EMOJI[k] && <Emoji name={KIND_EMOJI[k]} size="1.15em" />} {k}
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>
      </div>
    </section>
  )
}
