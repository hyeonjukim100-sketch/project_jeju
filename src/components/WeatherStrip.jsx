import { airText, momentOf, skyOf } from '../lib/moods'
import Emoji from './Emoji'

export default function WeatherStrip({ w }) {
  if (!w) return <div className="weather-strip">날씨를 불러오는 중…</div>
  const sky = skyOf(w)
  const moment = momentOf(w.time)
  return (
    <div className="weather-strip">
      <div className="ws-moment">
        <Emoji name={moment.emoji} size="2.2rem" />
        <div>
          <div className="ws-title">{moment.text}</div>
          <div className="ws-sub">지금 제주 · {w.time.slice(11)}</div>
        </div>
      </div>
      <div className="ws-sky">
        <Emoji name={sky.emoji} size="1.8rem" />
        <span>
          {sky.text} {Math.round(w.temp)}° <small>체감 {Math.round(w.feels)}°</small>
        </span>
      </div>
      <div className="ws-meta">
        <span>{airText(w.pm25)}</span>
        <span>
          일출 {w.sunrise.slice(11)} · 일몰 {w.sunset.slice(11)}
        </span>
        <span>자외선 최대 {Math.round(w.uvMax)}</span>
      </div>
    </div>
  )
}
