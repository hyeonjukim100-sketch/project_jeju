import { useEffect, useMemo, useRef, useState } from 'react'
import JejuMap3D from './JejuMap3D'
import SeasonTab from './SeasonTab'
import SuggestStrip from './SuggestStrip'
import WeatherStrip from './WeatherStrip'
import Emoji from './Emoji'
import CitrusRating from './CitrusRating'
import FavButton from './FavButton'
import ReviewBox from './ReviewBox'
import TripRecord from './TripRecord'
import { fetchPhotos, fetchPlaces } from '../api/client'
import { SPACE_LABEL } from '../lib/space'
import { ratingsFor } from '../lib/reviews'
import { isSupabaseReady } from '../lib/supabase'
import { KIND_CHIPS, KIND_EMOJI, KIND_GROUP } from '../lib/moods'
import { useAppStore } from '../store/useAppStore'

const START_MIN = 10 * 60 // 하루는 10:00 에 시작한다고 보고 예상 시각을 계산한다
const STAY = { spot: 60, meal: 60, rest: 40 } // 머무는 시간(분): 구경 60, 식사 60, 쉬어가기 40
const STOP_LABEL = { spot: '구경', meal: '식사', rest: '쉬어가기' }
const STOP_EMOJI = { meal: 'food', rest: 'coffee' }
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
                  <button type="button" className="chip" onClick={() => addStop({ type: cat === 'FD6' ? 'meal' : 'rest', title: p.title, kind: p.category, address: p.address, lat: p.lat, lng: p.lng, url: p.url })}>
                    담기
                  </button>
                  <FavButton placeId={`kakao:${p.id}`} title={p.title} kind={p.category} address={p.address} lat={p.lat} lng={p.lng} />
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

// 올레길: 코스 정보 카드 (올레코스 API). 지도 선은 OlleLines.jsx 에 꺼 두었다
function OlleCourses() {
  const { olle, selectedOlle, selectOlle, loadOlle } = useAppStore()
  const top = useRef(null)
  useEffect(() => {
    loadOlle()
  }, [])
  // 칩 목록이 길어서 카드가 아래에 숨으므로, 카드가 준비되면 그 위치로 내려간다
  useEffect(() => {
    const el = top.current
    if (olle.length) el?.closest('.glass-panel')?.scrollTo({ top: el.offsetTop - 8 })
  }, [olle.length])
  // 3코스·15코스처럼 A/B 가 있는 코스를 구분하려고 "번호|이름" 으로 고른다
  const keyOf = (c) => `${c.id}|${c.name}`
  const cur = olle.find((c) => keyOf(c) === selectedOlle)
  // "시작-끝" 으로 나뉘는 코스만 둘로 나눈다 (18-2 코스처럼 지점이 여럿이면 그대로 보여 준다)
  const ends = (route) => {
    const p = route.split('-')
    return p.length === 2 ? { start: p[0].trim(), end: p[1].trim() } : null
  }
  const curEnds = cur && ends(cur.route)

  return (
    <div ref={top}>
      <p className="small text-secondary mt-3">제주 올레코스 현황(공공데이터포털)의 코스 정보예요. 걷기 전에 거리와 시간을 가늠해 보세요.</p>
      {cur && (
        <div className="olle-card">
          <div className="fw-semibold">
            <Emoji name="footprints" size="1.1em" /> {cur.id}코스 · {cur.name}
          </div>
          <div className="small mb-1">
            {cur.km}km · {cur.time}
          </div>
          {curEnds ? (
            <div className="olle-ends">
              <div>
                <span className="olle-pin start">시작</span> {curEnds.start}
              </div>
              <div>
                <span className="olle-pin end">끝</span> {curEnds.end}
              </div>
            </div>
          ) : (
            <div className="small">
              <span className="olle-pin start">지점</span> {cur.route}
            </div>
          )}
        </div>
      )}
      {olle.length === 0 && <div className="small text-secondary">올레코스를 불러오는 중…</div>}
      <ul className="olle-list">
        {olle.map((c) => (
          <li key={keyOf(c)}>
            <button type="button" className={`olle-item ${keyOf(c) === selectedOlle ? 'on' : ''}`} aria-pressed={keyOf(c) === selectedOlle} onClick={() => selectOlle(keyOf(c) === selectedOlle ? null : keyOf(c))}>
              <span className="olle-no">{c.id}</span>
              <span className="flex-grow-1 text-start">
                {c.name}
                <span className="small text-secondary d-block">
                  {c.km}km · {c.time}
                </span>
                {ends(c.route) && (
                  <span className="small text-secondary d-block">
                    {ends(c.route).start} → {ends(c.route).end}
                  </span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// 동선 목록 (내 동선은 고칠 수 있고, 추천 동선은 읽기만 된다)
function RouteList({ stops, legs, editable, onOpen }) {
  const { removeStop, moveStop } = useAppStore()

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

  return (
    <>
      <ol className="plan-list">
        {stops.map((s, i) => (
          <li key={`${s.title}-${i}`}>
            <div className="plan-row">
              <span className="plan-no">{i + 1}</span>
              <div className="flex-grow-1">
                <div className="plan-time">
                  {clock(etas[i])} · {STOP_LABEL[s.type]} {STAY[s.type]}분
                </div>
                <button type="button" className="plan-title" onClick={() => onOpen(s)}>
                  <Emoji name={STOP_EMOJI[s.type] || KIND_EMOJI[s.kind] || 'pin'} size="1.1em" /> {s.title}
                </button>
                <div className="small text-secondary">{s.kind}</div>
              </div>
              {editable && (
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
              )}
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
        <div className="small text-secondary">이동시간은 자동차 기준 예상이고, 머무는 시간은 구경·식사 60분, 쉬어가기 40분으로 계산했어요.</div>
      </div>
    </>
  )
}

function PlanTab({ spots }) {
  const { plan, recPlan, planView, setPlanView, planBusy, generatePlan, adoptRecPlan, clearPlan, selectSpot, setPanelTab } = useAppStore()

  const open = (s) => {
    const spot = spots.find((x) => x.title === s.title)
    if (spot) {
      selectSpot(spot)
      setPanelTab('places')
    }
  }

  return (
    <>
      <div className="sub-tabs" role="tablist" aria-label="동선 보기">
        <button type="button" role="tab" aria-selected={planView === 'mine'} className={planView === 'mine' ? 'on' : ''} onClick={() => setPlanView('mine')}>
          내 동선{plan.stops.length > 0 && ` ${plan.stops.length}`}
        </button>
        <button type="button" role="tab" aria-selected={planView === 'rec'} className={planView === 'rec' ? 'on' : ''} onClick={() => setPlanView('rec')}>
          추천 동선{recPlan.stops.length > 0 && ` ${recPlan.stops.length}`}
        </button>
      </div>

      {planView === 'mine' ? (
        <>
          {plan.stops.length === 0 ? (
            <p className="small text-secondary">
              아직 비어 있어요. 장소에서 “동선에 담기”를 누르거나, “추천 동선”에서 마음에 드는 하루를 가져와 보세요.
            </p>
          ) : (
            <>
              <RouteList stops={plan.stops} legs={plan.legs} editable onOpen={open} />
              <button type="button" className="chip" onClick={clearPlan}>
                동선 비우기
              </button>
              <TripRecord />
            </>
          )}
        </>
      ) : (
        <>
          <button type="button" className="btn-soft w-100" onClick={generatePlan} disabled={planBusy}>
            {planBusy ? '동선을 만드는 중…' : recPlan.stops.length ? '다시 추천받기' : '오늘 기분에 맞는 동선 추천받기'}
          </button>
          <p className="small text-secondary mt-2">슬라이더로 고른 기분에 맞춰 규칙으로 고른 하루예요. 마음에 안 들면 다시 추천받을 수 있고, 내 동선에는 영향을 주지 않아요.</p>
          {recPlan.stops.length === 0 ? (
            <p className="small text-secondary mb-0">아직 추천이 없어요.</p>
          ) : (
            <>
              <RouteList stops={recPlan.stops} legs={recPlan.legs} onOpen={open} />
              <button type="button" className="btn-soft w-100" onClick={adoptRecPlan}>
                {plan.stops.length > 0 ? '내 동선을 이 추천으로 바꾸기' : '이 동선으로 하기'}
              </button>
              {plan.stops.length > 0 && <p className="small text-secondary mt-2 mb-0">지금 내 동선({plan.stops.length}곳)은 이 추천으로 바뀌어요.</p>}
            </>
          )}
        </>
      )}
    </>
  )
}


// 고른 종류의 장소 목록 (핀과 같은 이모지). 천여 곳일 수 있어 먼저 40곳만 보여 준다.
function PlaceList({ spots }) {
  const selectSpot = useAppStore((s) => s.selectSpot)
  const [more, setMore] = useState(40)
  useEffect(() => setMore(40), [spots])
  if (!spots.length) return <p className="small text-secondary mt-2">불러오는 중이에요…</p>
  return (
    <>
      <div className="small text-secondary mt-2">{spots.length}곳</div>
      <ul className="place-list">
        {spots.slice(0, more).map((s) => (
          <li key={s.id}>
            <button type="button" onClick={() => selectSpot(s)}>
              <Emoji name={KIND_EMOJI[KIND_GROUP[s.kind]] || KIND_EMOJI[s.kind] || 'pin'} size="1.3em" />
              <span className="text-start">
                <span className="place-name">{s.title}</span>
                <span className="small text-secondary d-block">{s.address}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {spots.length > more && (
        <button type="button" className="chip mt-2" onClick={() => setMore((m) => m + 40)}>
          더 보기
        </button>
      )}
    </>
  )
}

// 스크롤하면 나오는 화면: 날씨 → 3D 지도 + 하루 동선
export default function Explore() {
  const { spots, weather, selectedSpot: spot, selectSpot, plan, panelTab, setPanelTab, addStop, loadSpots, loadWeather } = useAppStore()
  const [kind, setKind] = useState('전체')
  const [folded, setFolded] = useState(false) // 모바일: 시트를 접어 지도를 넓게 본다

  useEffect(() => {
    loadSpots()
    loadWeather()
  }, [])

  const kinds = ['전체', '푸른 공간', '초록 공간', ...KIND_CHIPS]
  const shown = useMemo(() => {
    if (kind === '전체') return spots
    if (kind === '푸른 공간') return spots.filter((s) => s.space === 'blue')
    if (kind === '초록 공간') return spots.filter((s) => s.space === 'green')
    return spots.filter((s) => KIND_GROUP[s.kind] === kind)
  }, [spots, kind])

  return (
    <section id="explore" className="explore">
      <WeatherStrip w={weather} />
      <SuggestStrip />
      <div className="map-stage">
        <JejuMap3D spots={shown} weather={weather} />
        <aside className={`glass-panel ${panelTab === 'plan' || panelTab === 'season' || spot ? 'tall' : ''} ${folded ? 'folded' : ''}`}>
          <button type="button" className="sheet-toggle" onClick={() => setFolded((f) => !f)} aria-expanded={!folded} aria-label={folded ? '패널 펼치기' : '패널 접고 지도 보기'}>
            <i className={`bi bi-chevron-${folded ? 'up' : 'down'}`} /> {folded ? '펼치기' : '지도 보기'}
          </button>
          <div className="panel-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={panelTab === 'places'} className={panelTab === 'places' ? 'on' : ''} onClick={() => setPanelTab('places')}>
              <Emoji name="pin" size="1.15em" /> 장소
            </button>
            <button type="button" role="tab" aria-selected={panelTab === 'plan'} className={panelTab === 'plan' ? 'on' : ''} onClick={() => setPanelTab('plan')}>
              <Emoji name="map" size="1.15em" /> 하루 동선{plan.stops.length > 0 && ` ${plan.stops.length}`}
            </button>
            <button type="button" role="tab" aria-selected={panelTab === 'season'} className={panelTab === 'season' ? 'on' : ''} onClick={() => setPanelTab('season')}>
              <Emoji name="season_spring" size="1.15em" /> 계절 추천
            </button>
          </div>

          {panelTab === 'season' ? (
            <SeasonTab />
          ) : panelTab === 'plan' ? (
            <PlanTab spots={spots} />
          ) : spot ? (
            <>
              <button type="button" className="chip mb-2" onClick={() => selectSpot(null)}>
                <i className="bi bi-chevron-left" /> 목록으로
              </button>
              <div className="panel-kicker">
                {KIND_EMOJI[spot.kind] && <Emoji name={KIND_EMOJI[spot.kind]} size="1.1em" />} {spot.kind}
                {spot.space && <span className={`space-badge ${spot.space}`}>{SPACE_LABEL[spot.space]}</span>}
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
              <FavButton placeId={spot.id} title={spot.title} kind={spot.kind} address={spot.address} lat={spot.lat} lng={spot.lng} />
              <Gallery spot={spot} />
              <Nearby spot={spot} />
              <p className="spot-intro">{spot.intro}</p>
              <ReviewBox placeId={spot.id} title={spot.title} />
            </>
          ) : (
            <>
              <h2 className="panel-title">느린 제주 마음지도</h2>
              <p className="small text-secondary mb-2">마음에 드는 곳의 핀을 눌러 보세요.</p>
              <div className="kind-chips">
                {kinds.map((k) => (
                  <button key={k} type="button" className={`chip ${k === kind ? 'on' : ''}`} onClick={() => setKind(k)}>
                    {KIND_EMOJI[k] && <Emoji name={KIND_EMOJI[k]} size="1.15em" />} {k}
                  </button>
                ))}
              </div>
              {kind === '올레코스' ? <OlleCourses /> : <PlaceList spots={shown} />}
            </>
          )}
        </aside>
      </div>
    </section>
  )
}
