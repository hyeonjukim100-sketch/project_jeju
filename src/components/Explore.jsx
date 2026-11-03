import { useEffect, useMemo, useRef, useState } from 'react'
import ChipSlider from './ChipSlider'
import JejuMap3D from './JejuMap3D'
import SeasonTab from './SeasonTab'
import SuggestStrip from './SuggestStrip'
import WeatherStrip from './WeatherStrip'
import Emoji from './Emoji'
import CitrusRating from './CitrusRating'
import FavButton from './FavButton'
import BusLegDetail, { BUS_URL } from './BusLegDetail'
import ReviewBox from './ReviewBox'
import SpotDetail from './SpotDetail'
import TripRecord from './TripRecord'
import { fetchPhotos, fetchPlaces } from '../api/client'
import { isWellness } from '../lib/wellness'
import { ratingsFor } from '../lib/reviews'
import { isSupabaseReady } from '../lib/supabase'
import { KIND_CHIPS, KIND_EMOJI, KIND_GROUP } from '../lib/moods'
import { activityName, routeTitle } from '../lib/routeTitle'
import { useIsMobile } from '../lib/useIsMobile'
import { useAppStore } from '../store/useAppStore'

const START_MIN = 10 * 60 // 하루는 10:00 에 시작한다고 보고 예상 시각을 계산한다
const STAY = { spot: 60, meal: 60, rest: 40 } // 머무는 시간(분): 구경 60, 식사 60, 쉬어가기 40
const STOP_EMOJI = { meal: 'food', rest: 'coffee' }
const LONG_WALK = 30 // 걷는 구간이 30분을 넘으면 많이 멀다고 알려 준다
// 60분이 넘으면 "6시간 37분" 처럼 읽기 쉽게
const hm = (m) => (m >= 60 ? `${Math.floor(m / 60)}시간${m % 60 ? ` ${m % 60}분` : ''}` : `${m}분`)
const TRANSPORTS = [
  { key: 'car', label: '자동차', icon: 'bi-car-front' },
  { key: 'walk', label: '걷기', icon: 'bi-person-walking' },
  { key: 'bus', label: '버스', icon: 'bi-bus-front' },
]
const LONG_LEG = 35 // 느린 일정: 한 구간 이동은 35분 안쪽
// 모바일 아래 시트 높이: 닫힘은 손잡이+탭 높이(rem), 중간은 지도 영역의 비율, 가득은 위에 남기는 지도 높이(rem)
const PEEK_REM = 11.5
const MID_RATIO = 0.55
const EXPAND_PX = 24 // 목록을 이만큼 내리면 가득 펼친다
const FULL_GAP_REM = 0 // 가득 올리면 지도를 완전히 덮는다
const clock = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

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
// 동선 맨 위 큰 카드의 배경 사진: 첫 곳의 사진 (없으면 종류 이모지)
function RouteHeroPic({ stop }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let live = true
    setUrl(null)
    if (stop?.title && Number.isFinite(stop.lat) && Number.isFinite(stop.lng)) {
      fetchPhotos(stop)
        .then((r) => live && setUrl(r.photos?.[0]?.url || null))
        .catch(() => {})
    }
    return () => {
      live = false
    }
  }, [stop?.title])
  const emoji = STOP_EMOJI[stop?.type] || KIND_EMOJI[KIND_GROUP[stop?.kind]] || KIND_EMOJI[stop?.kind] || 'pin'
  return (
    <div className="route-head-pic">
      {url ? <img className="route-head-photo" src={url} alt="" onError={() => setUrl(null)} /> : <Emoji name={emoji} size="3rem" />}
    </div>
  )
}

function RouteList({ stops, legs, editable, onOpen, hasInfo, mood = null }) {
  const { removeStop, moveStop, transport, setTransport } = useAppStore()
  const bus = transport === 'bus'
  const legMin = (l) => (transport === 'walk' ? l.walk ?? Math.round(l.km * 13.3) : l.minutes) // 걷기는 시속 4.5km 어림
  const longLimit = transport === 'walk' ? LONG_WALK : LONG_LEG

  // 예상 시각: 시작 + (머문 시간 + 이동시간) 을 차례로 더한다
  const etas = useMemo(() => {
    let t = START_MIN
    return stops.map((s, i) => {
      const at = t
      t += STAY[s.type] + (legs[i] ? legMin(legs[i]) : 0)
      return at
    })
  }, [stops, legs, transport])
  const driveTotal = legs.reduce((a, l) => a + legMin(l), 0)
  const endAt = stops.length ? etas.at(-1) + STAY[stops.at(-1).type] : START_MIN
  const { chip, title } = routeTitle(stops, mood)

  // 다음 곳까지의 이동 방법·시간·거리 (카드 안 칩)
  const moveChip = (l) => {
    if (!l) return '이동시간 계산 중…'
    if (bus) {
      return (
        <>
          <i className="bi bi-bus-front" /> 버스로 이동 <small>{l.km}km</small>
        </>
      )
    }
    const far = legMin(l) > longLimit
    return (
      <>
        <i className={`bi ${transport === 'walk' ? 'bi-person-walking' : 'bi-car-front'}`} /> {transport === 'walk' ? '걸어서' : '차로'} 약 {hm(legMin(l))}{' '}
        <small>({l.km}km){far && (transport === 'walk' ? ' · 많이 멀어요' : ' · 조금 멀어요')}</small>
      </>
    )
  }

  return (
    <>
      {stops.length > 0 && (
        <div className="route-head">
          <RouteHeroPic stop={stops[0]} />
          <div className="route-head-info">
            {chip && <span className="route-mood">{chip}</span>}
            <h3 className="route-title">{title}</h3>
            <div className="route-sum">
              {bus ? `총 ${stops.length}곳 · 버스 이동 거리 ${legs.reduce((a, l) => a + l.km, 0).toFixed(1)}km` : `총 ${stops.length}곳 · 이동 ${driveTotal}분 · ${clock(START_MIN)}에 시작하면 ${clock(endAt)}쯤 마쳐요`}
            </div>
          </div>
        </div>
      )}
      <div className="kind-chips mb-2" role="group" aria-label="이동 수단">
        {TRANSPORTS.map((t) => (
          <button key={t.key} type="button" aria-pressed={transport === t.key} className={`chip ${transport === t.key ? 'on' : ''}`} onClick={() => setTransport(t.key)}>
            <i className={`bi ${t.icon}`} /> {t.label}
          </button>
        ))}
      </div>
      <ol className="plan-list">
        {stops.map((s, i) => (
          <li key={`${s.title}-${i}`}>
            <div className="route-card">
              <div className="route-card-top">
                <span className="plan-no">{i + 1}</span>
                <div className="route-card-main">
                  <div className="route-act">{activityName(s)}</div>
                  <button type="button" className="plan-title" onClick={() => onOpen(s)}>
                    <Emoji name={STOP_EMOJI[s.type] || KIND_EMOJI[s.kind] || 'pin'} size="1.1em" /> {s.title}
                  </button>
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
              <div className="route-chips">
                <span className="route-chip">
                  {bus ? '' : `${clock(etas[i])} · `}
                  {STAY[s.type]}분 머물기
                </span>
                {s.url && (
                  <a className="chip plan-more text-decoration-none" href={s.url} target="_blank" rel="noreferrer">
                    카카오맵에서 보기 <i className="bi bi-box-arrow-up-right" />
                  </a>
                )}
                {hasInfo?.(s) && (
                  <button type="button" className="chip plan-more" onClick={() => onOpen(s)}>
                    설명 보기 <i className="bi bi-chevron-right" />
                  </button>
                )}
              </div>
            </div>
            {i < stops.length - 1 && (
              <div className={`route-move ${!bus && legs[i] && legMin(legs[i]) > longLimit ? 'long' : ''}`}>
                <span className="route-move-text">{moveChip(legs[i])}</span>
                {bus && <BusLegDetail key={`${s.title}->${stops[i + 1].title}`} from={s} to={stops[i + 1]} />}
              </div>
            )}
          </li>
        ))}
        {bus && stops.length > 0 && (
          <li className="plan-bus">
            <a className="chip bus-link text-decoration-none" href={BUS_URL} target="_blank" rel="noreferrer">
              <Emoji name="bus" size="1.2em" /> 제주버스정보시스템에서 배차 보기 <i className="bi bi-box-arrow-up-right" />
            </a>
          </li>
        )}
      </ol>
      <div className="plan-sum">
        <div className="small text-secondary">
          {bus
            ? '버스는 거리만 보여 드려요. 배차 간격과 시간은 위 버스 버튼에서 제주버스정보시스템으로 확인해 주세요. 머무는 시간은 구경·식사 60분, 쉬어가기 40분이에요.'
            : `이동시간은 ${transport === 'walk' ? '시속 4.5km로 걷는 것' : '자동차'} 기준 예상이고, 머무는 시간은 구경·식사 60분, 쉬어가기 40분으로 계산했어요.`}
        </div>
      </div>
    </>
  )
}

function PlanTab({ spots }) {
  const { plan, recPlan, planView, setPlanView, planBusy, generatePlan, adoptRecPlan, clearPlan, selectSpot, setPanelTab, addStop, favs, user, onlyRoute, setOnlyRoute, moodLevel } = useAppStore()
  const favList = Object.values(favs).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))

  const info = (s) => spots.find((x) => x.title === s.title)
  const open = (s) => {
    const spot = info(s)
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
        <button type="button" role="tab" aria-selected={planView === 'fav'} className={planView === 'fav' ? 'on' : ''} onClick={() => setPlanView('fav')}>
          찜한 곳{favList.length > 0 && ` ${favList.length}`}
        </button>
      </div>

      {planView === 'fav' ? (
        !user ? (
          <p className="small text-secondary">로그인하면 찜한 곳을 동선에 바로 담을 수 있어요.</p>
        ) : favList.length === 0 ? (
          <p className="small text-secondary">아직 찜한 곳이 없어요. 장소에서 “찜”을 눌러 두면 여기에 모여요.</p>
        ) : (
          <ul className="place-list">
            {favList.map((f) => {
              const inPlan = plan.stops.some((s) => s.title === f.place_title)
              return (
                <li key={f.place_id} className="place-row">
                  <Emoji name={KIND_EMOJI[KIND_GROUP[f.kind]] || KIND_EMOJI[f.kind] || 'pin'} size="1.3em" />
                  <span className="place-text">
                    <span className="place-name">{f.place_title}</span>
                    {f.address && <span className="small text-secondary d-block">{f.address}</span>}
                  </span>
                  {f.place_id.startsWith('kakao:') && (
                    <a className="chip place-link text-decoration-none" href={`https://place.map.kakao.com/${f.place_id.slice(6)}`} target="_blank" rel="noreferrer">
                      카카오맵 <i className="bi bi-box-arrow-up-right" />
                    </a>
                  )}
                  <button
                    type="button"
                    className="chip"
                    disabled={inPlan || f.lat == null}
                    onClick={() => addStop({ type: 'spot', title: f.place_title, kind: f.kind, address: f.address, lat: f.lat, lng: f.lng })}
                  >
                    {inPlan ? '담김' : '담기'}
                  </button>
                </li>
              )
            })}
          </ul>
        )
      ) : planView === 'mine' ? (
        <>
          {plan.stops.length === 0 ? (
            <p className="small text-secondary">
              아직 비어 있어요. 장소에서 “동선에 담기”를 누르거나, “추천 동선”에서 마음에 드는 하루를 가져와 보세요.
            </p>
          ) : (
            <>
              <RouteList stops={plan.stops} legs={plan.legs} editable onOpen={open} hasInfo={info} />
              <div className="plan-actions">
                <button type="button" className={`chip ${onlyRoute ? 'on' : ''}`} aria-pressed={onlyRoute} onClick={() => setOnlyRoute(!onlyRoute)}>
                  <Emoji name="footprints" size="1.15em" /> {onlyRoute ? '전체 핀 보기' : '동선 확인하기'}
                </button>
                <button type="button" className="chip" onClick={clearPlan}>
                  <Emoji name="wind" size="1.15em" /> 동선 비우기
                </button>
              </div>
              <TripRecord />
            </>
          )}
        </>
      ) : (
        <>
          <button type="button" className="btn-soft w-100" onClick={generatePlan} disabled={planBusy}>
            {planBusy ? '동선을 만드는 중…' : recPlan.stops.length ? '다시 추천받기' : '오늘 기분에 맞는 동선 추천받기'}
          </button>
          <p className="small text-secondary mt-2">오늘의 기분을 반영해 추천한 동선이에요. 마음에 안 들면 다시 추천받을 수 있고, 내 동선에는 영향을 주지 않아요.</p>
          {recPlan.stops.length === 0 ? (
            <p className="small text-secondary mb-0">아직 추천이 없어요.</p>
          ) : (
            <>
              <RouteList stops={recPlan.stops} legs={recPlan.legs} onOpen={open} hasInfo={info} mood={recPlan.mood ?? moodLevel} />
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


// 장소 격자 카드: 사진은 화면에 보일 때만 불러온다 (사진이 없으면 종류 이모지)
function PlaceCard({ spot, onOpen }) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  const [url, setUrl] = useState(null)
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === 'undefined') return setSeen(true)
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setSeen(true), io.disconnect()), { rootMargin: '80px' })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    if (!seen) return
    let live = true
    fetchPhotos(spot)
      .then((r) => live && setUrl(r.photos?.[0]?.url || null))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [seen, spot.id])
  const emoji = KIND_EMOJI[KIND_GROUP[spot.kind]] || KIND_EMOJI[spot.kind] || 'pin'
  return (
    <button type="button" className="place-card" onClick={onOpen}>
      <span className="place-card-pic" ref={ref}>
        {url ? <img className="place-card-photo" src={url} alt="" loading="lazy" onError={() => setUrl(null)} /> : <Emoji name={emoji} size="2rem" />}
        {isWellness(spot.title) && <span className="place-card-tag">웰니스</span>}
      </span>
      <span className="place-card-name">{spot.title}</span>
      <span className="place-card-sub">{spot.address}</span>
    </button>
  )
}

// 고른 종류의 장소 목록 (핀과 같은 이모지). 천여 곳일 수 있어 먼저 40곳만 보여 준다.
function PlaceList({ spots }) {
  const selectSpot = useAppStore((s) => s.selectSpot)
  const [more, setMore] = useState(40)
  useEffect(() => setMore(40), [spots])
  const loaded = useAppStore((s) => s.spots.length > 0)
  if (!spots.length) return <p className="small text-secondary mt-2">{loaded ? '찾는 곳이 없어요. 다른 말로 찾아 보세요.' : '불러오는 중이에요…'}</p>
  return (
    <>
      <div className="small text-secondary mt-2">{spots.length}곳</div>
      <ul className="place-grid">
        {spots.slice(0, more).map((s) => (
          <li key={s.id}>
            <PlaceCard spot={s} onOpen={() => selectSpot(s)} />
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
  const { spots, weather, selectedSpot: spot, selectSpot, plan, recPlan, planView, onlyRoute, panelTab, setPanelTab, addStop, loadSpots, loadWeather, seasonName, seasonPicks } = useAppStore()
  const mobile = useIsMobile()
  const [kind, setKind] = useState('전체')
  const [query, setQuery] = useState('')
  // 모바일 아래 시트: 처음엔 탭만 보이고(peek), 탭이나 핀을 누르면 열리며(mid), 끌어서 더 키울 수 있다(full)
  const [size, setSize] = useState('peek')
  const [dragH, setDragH] = useState(null)
  const panelRef = useRef(null)
  const drag = useRef({ y: 0, h: 0, moved: 0 })

  useEffect(() => {
    loadSpots()
    loadWeather()
  }, [])

  // 장소를 고르거나 다른 탭으로 가면 닫혀 있던 시트를 연다 (처음 화면에서는 열지 않는다)
  const prev = useRef({ spot, panelTab })
  useEffect(() => {
    const was = prev.current
    prev.current = { spot, panelTab }
    const picked = spot && spot !== was.spot // 장소를 새로 골랐다
    if (picked || panelTab !== was.panelTab) setSize((s) => (s === 'peek' ? 'mid' : s))
  }, [spot, panelTab])

  const heights = () => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    const stage = panelRef.current.parentElement.offsetHeight
    return { peek: PEEK_REM * rem, mid: stage * MID_RATIO, full: stage - FULL_GAP_REM * rem }
  }
  const onGripDown = (e) => {
    drag.current = { y: e.clientY, h: panelRef.current.offsetHeight, moved: 0 }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onGripMove = (e) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    const d = drag.current
    d.moved = Math.max(d.moved, Math.abs(e.clientY - d.y))
    if (d.moved < 6) return
    const h = heights()
    setDragH(Math.min(h.full, Math.max(h.peek, d.h + d.y - e.clientY)))
  }
  const onGripUp = () => {
    const d = drag.current
    if (d.moved < 6) return
    // 놓은 자리에서 가장 가까운 단계로 붙는다
    const h = heights()
    const now = panelRef.current.offsetHeight
    setSize(Object.keys(h).reduce((a, k) => (Math.abs(h[k] - now) < Math.abs(h[a] - now) ? k : a)))
    setDragH(null)
  }
  // 반쯤 열린 목록을 아래로 조금 더 내리면 화면 가득 펼쳐서 지도는 자연스럽게 사라지고, 맨 위까지 다시 올리면 지도가 돌아온다
  const lastTop = useRef(0)
  const expandedAt = useRef(0)
  const onPanelScroll = (e) => {
    const top = e.currentTarget.scrollTop
    const down = top > lastTop.current
    lastTop.current = top
    if (!mobile || dragH != null) return
    if (size === 'mid' && down && top > EXPAND_PX) {
      expandedAt.current = Date.now()
      setSize('full')
    } else if (size === 'full' && !down && top <= 0 && Date.now() - expandedAt.current > 800) setSize('mid') // 펼치는 동안 스크롤 위치가 보정되는 것은 무시
  }
  const onGripClick = () => {
    if (drag.current.moved >= 6) return void (drag.current.moved = 0)
    setSize((s) => (s === 'peek' ? 'mid' : 'peek'))
  }

  const kinds = ['전체', '푸른 공간', '초록 공간', ...KIND_CHIPS]
  const shown = useMemo(() => {
    let list = spots
    if (kind === '푸른 공간') list = spots.filter((s) => s.space === 'blue')
    else if (kind === '초록 공간') list = spots.filter((s) => s.space === 'green')
    else if (kind !== '전체') list = spots.filter((s) => KIND_GROUP[s.kind] === kind)
    const q = query.trim().toLowerCase()
    return q ? list.filter((s) => `${s.title} ${s.address || ''}`.toLowerCase().includes(q)) : list
  }, [spots, kind, query])

  // "동선 확인하기": 지금 보는 동선의 곳만 지도에 남긴다 (식당·카페처럼 목록에 없는 곳도 핀으로)
  const viewed = planView === 'rec' ? recPlan.stops : plan.stops
  const routeSpots = useMemo(
    () => viewed.map((st) => spots.find((x) => x.title === st.title) || { ...st, id: `stop:${st.title}` }),
    [viewed, spots],
  )
  // 동선 탭에서는 지금 보는 동선의 곳만, 계절 추천 탭에서는 추천된 곳만 핀으로 남긴다.
  // 웹은 "전체 핀 보기" 버튼으로 동선 탭의 모든 핀을 다시 볼 수 있다 (모바일은 늘 동선의 핀만).
  const routeOnly = panelTab === 'plan' && (mobile || onlyRoute) && routeSpots.length > 0
  const seasonOnly = panelTab === 'season' && !!seasonPicks[seasonName]?.length
  const mapSpots = seasonOnly ? [] : routeOnly ? routeSpots : shown

  // 하루 동선·계절 추천을 보면 그 곳들이 있는 지역으로 지도를 옮긴다 (곳이 바뀌거나 탭을 열 때마다)
  const fitTo = useAppStore((s) => s.fitTo)
  const fitPts = (panelTab === 'plan' ? viewed : panelTab === 'season' ? seasonPicks[seasonName] || [] : []).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
  const fitKey = fitPts.map((p) => `${p.lat},${p.lng}`).join('|')
  useEffect(() => {
    if (fitPts.length) fitTo(fitPts.map((p) => ({ lat: p.lat, lng: p.lng })))
  }, [fitKey, panelTab])

  return (
    <section id="explore" className="explore">
      <div className="explore-info">
        <WeatherStrip w={weather} />
        <SuggestStrip />
      </div>
      <div className="map-stage">
        <div className="map-view">
          <JejuMap3D spots={mapSpots} weather={weather} />
        </div>
        <aside ref={panelRef} className={`glass-panel sheet-${size} ${dragH != null ? 'dragging' : ''}`} style={dragH != null ? { height: dragH } : undefined} onScroll={onPanelScroll}>
          <button
            type="button"
            className="sheet-handle"
            aria-expanded={size !== 'peek'}
            aria-label={size === 'peek' ? '목록 열기' : '목록 닫고 지도 보기'}
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={onGripDown}
            onPointerMove={onGripMove}
            onPointerUp={onGripUp}
            onPointerCancel={onGripUp}
            onClick={onGripClick}
          >
            <span className="sheet-grip" aria-hidden="true" />
            <span className="sheet-handle-text">{size === 'peek' ? '위로 끌어 목록 보기' : '끌어서 지도와 목록 크기 바꾸기'}</span>
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
            <SpotDetail
              spot={spot}
              onBack={() => selectSpot(null)}
              onAdd={() => addStop({ type: 'spot', title: spot.title, kind: spot.kind, address: spot.address, lat: spot.lat, lng: spot.lng, tourId: spot.tourId || null })}
            >
              <Nearby spot={spot} />
            </SpotDetail>
          ) : (
            <>
              <h2 className="panel-title">느린 제주 마음지도</h2>
              <p className="small text-secondary mb-2">마음에 드는 곳의 핀을 눌러 보세요.</p>
              <div className="place-search">
                <i className="bi bi-search" aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="장소 이름이나 주소로 찾기"
                  aria-label="장소 검색"
                  enterKeyHint="search"
                />
                {query && (
                  <button type="button" className="place-search-x" onClick={() => setQuery('')} aria-label="검색어 지우기">
                    <i className="bi bi-x-lg" />
                  </button>
                )}
              </div>
              <ChipSlider>
                {kinds.map((k) => (
                  <button key={k} type="button" className={`chip ${k === kind ? 'on' : ''}`} onClick={() => setKind(k)}>
                    {KIND_EMOJI[k] && <Emoji name={KIND_EMOJI[k]} size="1.15em" />} {k}
                  </button>
                ))}
              </ChipSlider>
              {kind === '올레코스' ? <OlleCourses /> : <PlaceList spots={shown} />}
            </>
          )}
        </aside>
      </div>
    </section>
  )
}
