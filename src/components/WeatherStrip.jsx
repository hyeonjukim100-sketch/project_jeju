import { airText, momentOf, skyOf, uvText } from '../lib/moods'
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
          <div className="ws-sub">{w.time}</div>
        </div>
      </div>
      <div className="ws-sky">
        <Emoji name={sky.emoji} size="1.8rem" />
        <span>
          {sky.text} {Math.round(w.temp)}° <small>체감 {Math.round(w.feels)}°</small>
        </span>
      </div>
      <div className="ws-meta">
        {w.pm25 != null && (
          <span>
            <Emoji name="wind" size="1.25em" /> {airText(w.pm25)}
          </span>
        )}
        <span>
          <Emoji name="sunrise" size="1.25em" /> 일출 {w.sunrise}
        </span>
        <span>
          <Emoji name="sunset" size="1.25em" /> 일몰 {w.sunset}
        </span>
        <span>
          <Emoji name="sunglasses" size="1.25em" /> {uvText(w.uvMax)}
        </span>
      </div>
    </div>
  )
}
