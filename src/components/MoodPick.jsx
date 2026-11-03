import { useId } from 'react'
import { MOOD_LEVELS, moodOf } from '../lib/moods'
import Emoji from './Emoji'

// 기록용 기분 고르기(선택): 이모지 다섯 개 중 하나, 다시 누르면 비운다. 색에만 기대지 않고 이름도 함께 보여 준다.
export default function MoodPick({ label, value, onChange }) {
  const id = useId()
  return (
    <div className="mood-pick">
      <div className="mood-pick-label" id={id}>
        {label}
      </div>
      <div className="mood-pick-row" role="radiogroup" aria-labelledby={id}>
        {MOOD_LEVELS.map((m) => (
          <button key={m.emoji} type="button" role="radio" aria-checked={value === m.emoji} aria-label={m.label} className={`mood-pick-btn ${value === m.emoji ? 'on' : ''}`} onClick={() => onChange(value === m.emoji ? null : m.emoji)}>
            <Emoji name={m.emoji} size="1.7rem" />
          </button>
        ))}
      </div>
      <div className="mood-pick-name">{moodOf(value)?.label ?? '건너뛰어도 괜찮아요'}</div>
    </div>
  )
}
