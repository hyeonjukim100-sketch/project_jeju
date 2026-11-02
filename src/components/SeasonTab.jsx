import { useEffect } from 'react'
import Emoji from './Emoji'
import { season as nowSeason } from '../lib/season'
import { useAppStore } from '../store/useAppStore'

export const SEASON_CHIPS = [
  { key: 'spring', label: '봄', emoji: 'season_spring', note: '벚꽃·유채꽃 같은 꽃 구경' },
  { key: 'summer', label: '여름', emoji: 'season_summer', note: '해수욕과 바다 놀이' },
  { key: 'autumn', label: '가을', emoji: 'season_autumn', note: '오름·억새·숲길 걷기' },
  { key: 'winter', label: '겨울', emoji: 'season_winter', note: '동백과 한라산 설경' },
  { key: 'rainy', label: '비·눈 오는 날', emoji: 'season_rainy', note: '비나 눈이 올 때 실내에서 볼 곳' },
]

const RAINY = ['rain', 'snow', 'sleet']

// 계절 추천: 지금 계절을 기본으로, 비·눈이 오는 날엔 실내를 먼저. 계절 칩으로 다른 계절도 미리 볼 수 있다.
export default function SeasonTab() {
  const { weather, seasonName, setSeasonName, seasonPicks, loadSeason, addStop } = useAppStore()
  const raining = weather && RAINY.includes(weather.sky)

  // 처음 열 때 기본 칩 정하기
  useEffect(() => {
    if (!seasonName && weather) setSeasonName(raining ? 'rainy' : nowSeason) // 날씨가 도착한 뒤에 정한다
  }, [weather])
  const name = seasonName || (raining ? 'rainy' : nowSeason)

  useEffect(() => {
    loadSeason(name)
  }, [name])

  const picks = seasonPicks[name]
  const chip = SEASON_CHIPS.find((c) => c.key === name)

  return (
    <>
      <div className="kind-chips mb-2">
        {SEASON_CHIPS.map((c) => (
          <button key={c.key} type="button" aria-pressed={c.key === name} className={`chip ${c.key === name ? 'on' : ''}`} onClick={() => setSeasonName(c.key)}>
            <Emoji name={c.emoji} size="1.15em" /> {c.label}
            {c.key === nowSeason && ' · 지금'}
          </button>
        ))}
      </div>
      <p className="small text-secondary">
        {chip.note}.{name === 'rainy' && !raining && ' 지금은 비나 눈이 오지 않지만 미리 볼 수 있어요.'}
        {raining && name !== 'rainy' && ' 지금은 비·눈이 와서 “비·눈 오는 날”도 함께 살펴보세요.'}
      </p>

      {picks === undefined && <div className="small text-secondary">불러오는 중…</div>}
      {picks && picks.length === 0 && <div className="small text-secondary">추천을 찾지 못했어요.</div>}
      <ul className="season-list">
        {(picks || []).map((p, i) => (
          <li key={p.id} className="season-item">
            <img className="season-thumb" src={p.photo} alt="" loading="lazy" />
            <div className="flex-grow-1">
              <div className="season-title">
                <span className="season-no">{i + 1}</span> {p.title}
              </div>
              <div className="small text-secondary">{p.address}</div>
              {p.intro && <div className="small">{p.intro}</div>}
              {p.tags.length > 0 && <div className="review-tags">{p.tags.map((t) => `#${t}`).join(' ')}</div>}
              <button
                type="button"
                className="chip mt-1"
                onClick={() => addStop({ type: 'spot', title: p.title, kind: '관광지', address: p.address, lat: p.lat, lng: p.lng })}
              >
                동선에 담기
              </button>
            </div>
          </li>
        ))}
      </ul>
      {picks?.length > 0 && <div className="small text-secondary mt-2">사진·소개·태그: 제주관광공사(Visit Jeju). 지도에 번호로 표시돼요.</div>}
    </>
  )
}
