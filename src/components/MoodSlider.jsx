import { MOOD_GRADIENT, MOOD_LEVELS } from '../lib/moods'
import { useAppStore } from '../store/useAppStore'
import Emoji from './Emoji'

// 지침 ↔ 활기 5단계. 색에만 기대지 않도록 이모지와 단계 이름을 함께 보여 준다.
export default function MoodSlider({ onDone }) {
  const level = useAppStore((s) => s.moodLevel)
  const setLevel = useAppStore((s) => s.setMoodLevel)
  const cur = MOOD_LEVELS[level]

  return (
    <div className="mood-card">
      <div className="mood-now">
        <Emoji name={cur.emoji} size="3.4rem" className="mood-big" key={cur.emoji} />
        <div className="mood-label">{cur.label}</div>
      </div>

      <input
        type="range"
        min="0"
        max="4"
        step="1"
        value={level}
        onChange={(e) => setLevel(Number(e.target.value))}
        className="mood-range"
        style={{ background: MOOD_GRADIENT }}
        aria-label="오늘의 기분"
        aria-valuetext={cur.label}
      />

      <div className="mood-ticks">
        {MOOD_LEVELS.map((m, i) => (
          <button key={m.emoji} type="button" className={`mood-tick ${i === level ? 'on' : ''}`} onClick={() => setLevel(i)} aria-label={m.label}>
            <Emoji name={m.emoji} size="1.5rem" />
          </button>
        ))}
      </div>

      <button type="button" className="btn-soft" onClick={onDone}>
        이 기분에 맞는 곳 보기
      </button>
    </div>
  )
}
