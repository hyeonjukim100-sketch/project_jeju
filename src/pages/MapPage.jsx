import { useEffect, useMemo, useState } from 'react'
import JejuMap3D from '../components/JejuMap3D'
import { fetchPhotos } from '../api/client'
import { useAppStore } from '../store/useAppStore'

// 시간대별 문구 (제주 현지 시각 기준)
const MOMENTS = [
  [5, '아침 산책하기 좋은 시간'],
  [9, '커피 마시기 좋은 시간'],
  [12, '천천히 점심 먹는 시간'],
  [14, '쉬어가는 시간'],
  [16, '명상하기 좋은 시간'],
  [24, '사색에 잠기기 좋은 시간'],
]
const momentOf = (w) => {
  const h = Number(w.time.slice(11, 13))
  return (MOMENTS.find(([end]) => h < end) || MOMENTS.at(-1))[1]
}
const SKY_TEXT = (c) => (c === 0 ? '맑음' : c <= 3 ? '구름 조금' : c <= 48 ? '흐림·안개' : c <= 67 ? '비' : c <= 77 ? '눈' : '소나기')
const airText = (pm25) => (pm25 == null ? '' : pm25 <= 15 ? '숨쉬기 좋은 공기' : pm25 <= 35 ? '보통 공기' : '공기가 탁해요')

function WeatherCard({ w }) {
  if (!w) return <p className="text-secondary small mb-0">날씨를 불러오는 중…</p>
  return (
    <div className="weather-card">
      <div className="moment">{momentOf(w)}</div>
      <div className="small">
        {SKY_TEXT(w.code)} {Math.round(w.temp)}° · 체감 {Math.round(w.feels)}° · {airText(w.pm25)}
      </div>
      <div className="small text-secondary">
        일출 {w.sunrise.slice(11)} · 일몰 {w.sunset.slice(11)} · 자외선 최대 {Math.round(w.uvMax)}
      </div>
    </div>
  )
}

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
      <div className="small text-secondary mt-1">사진: {photos[idx].credit} ({photos[idx].source})</div>
    </div>
  )
}

export default function MapPage() {
  const { spots, weather, selectedSpot: spot, loadSpots, loadWeather } = useAppStore()
  const [kind, setKind] = useState('전체')

  useEffect(() => {
    loadSpots()
    loadWeather()
  }, [])

  const kinds = useMemo(() => ['전체', '사진 있는 곳', ...new Set(spots.map((s) => s.kind).filter(Boolean))], [spots])
  const shown = useMemo(() => (kind === '전체' ? spots : kind === '사진 있는 곳' ? spots.filter((s) => s.tourId) : spots.filter((s) => s.kind === kind)), [spots, kind])

  return (
    <div className="map-stage">
      <JejuMap3D spots={shown} weather={weather} />
      <aside className="glass-panel">
        <WeatherCard w={weather} />
        <hr />
        {spot ? (
          <>
            <div className="panel-kicker">{spot.kind}</div>
            <h2 className="panel-title">{spot.title}</h2>
            <div className="small text-secondary mb-2">{spot.address}</div>
            <Gallery spot={spot} />
            <p className="spot-intro">{spot.intro}</p>
          </>
        ) : (
          <>
            <h2 className="panel-title">느린 제주 마음지도</h2>
            <p className="text-secondary small">
              섬을 돌려 보고 핀을 눌러 보세요. 관광지 {spots.length ? `${shown.length}곳` : '불러오는 중…'}
            </p>
            <div className="d-flex flex-wrap gap-2">
              {kinds.map((k) => (
                <button key={k} className={`btn btn-sm ${k === kind ? 'btn-warning' : 'btn-outline-secondary'}`} onClick={() => setKind(k)}>
                  {k}
                </button>
              ))}
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
