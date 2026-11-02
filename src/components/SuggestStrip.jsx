import { useMemo } from 'react'
import Emoji from './Emoji'
import { KIND_EMOJI, KIND_GROUP, MOOD_LEVELS, skyOf } from '../lib/moods'
import { introLine, suggest } from '../lib/suggest'
import { useAppStore } from '../store/useAppStore'

// 오늘의 제안: 날씨와 기분에 맞춘 3곳을 챗을 열기 전에 미리 보여 준다
export default function SuggestStrip() {
  const { spots, weather, moodLevel, selectSpot, setPanelTab, askAi } = useAppStore()
  const day = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })

  const result = useMemo(() => suggest({ spots, weather, moodLevel, day }), [spots, weather, moodLevel, day])
  if (!result) return null
  const sky = skyOf(weather)
  const mood = MOOD_LEVELS[moodLevel]

  return (
    <div className="suggest">
      <div className="suggest-head">
        <div>
          <strong>오늘의 제안</strong>
          <span className="suggest-why">{introLine({ weather, moodLevel })}</span>
        </div>
        <button
          type="button"
          className="chip"
          onClick={() => askAi(`오늘 ${sky.text}이고 ${Math.round(weather.temp)}도예요. 기분은 “${mood.label}”인데, 어디를 가면 좋을까요?`)}
        >
          <i className="bi bi-chat-heart" /> AI에게 더 물어보기
        </button>
      </div>
      <div className="suggest-cards">
        {result.picks.map(({ spot, note }) => (
          <button
            key={spot.id}
            type="button"
            className="suggest-card"
            onClick={() => {
              selectSpot(spot)
              setPanelTab('places')
            }}
          >
            <Emoji name={KIND_EMOJI[KIND_GROUP[spot.kind]] || KIND_EMOJI[spot.kind] || 'pin'} size="1.6rem" />
            <span className="text-start">
              <span className="suggest-title">{spot.title}</span>
              <span className="suggest-note">{note}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
