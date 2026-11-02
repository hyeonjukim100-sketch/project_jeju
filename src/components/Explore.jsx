import { useEffect, useMemo, useState } from 'react'
import JejuMap3D from './JejuMap3D'
import WeatherStrip from './WeatherStrip'
import Emoji from './Emoji'
import { fetchPhotos } from '../api/client'
import { KIND_EMOJI, MOOD_LEVELS } from '../lib/moods'
import { useAppStore } from '../store/useAppStore'

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

// 스크롤하면 나오는 화면: 날씨 → 3D 지도 (하루 동선은 7단계에서 이 패널에 붙는다)
export default function Explore() {
  const { spots, weather, selectedSpot: spot, moodLevel, loadSpots, loadWeather } = useAppStore()
  const [kind, setKind] = useState('전체')

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
        <aside className="glass-panel">
          {spot ? (
            <>
              <div className="panel-kicker">
                {KIND_EMOJI[spot.kind] && <Emoji name={KIND_EMOJI[spot.kind]} size="1.1em" />} {spot.kind}
              </div>
              <h2 className="panel-title">{spot.title}</h2>
              <div className="small text-secondary mb-2">{spot.address}</div>
              <Gallery spot={spot} />
              <p className="spot-intro">{spot.intro}</p>
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
