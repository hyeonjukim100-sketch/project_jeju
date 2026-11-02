import { useEffect, useState } from 'react'
import AuthForm from '../components/AuthForm'
import Emoji from '../components/Emoji'
import { MOOD_LEVELS } from '../lib/moods'
import { isSupabaseReady } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

const labelOf = (key) => MOOD_LEVELS.find((m) => m.emoji === key)

// 내 기록: 로그인한 본인만 자기 기록을 보고 쓴다
export default function My() {
  const { user, authReady, signOut, moodLevel, moodLogs, moodLoading, loadMoodLogs, addMoodLog, deleteMoodLog } = useAppStore()
  const [level, setLevel] = useState(moodLevel)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (user) loadMoodLogs()
  }, [user?.id])

  if (!isSupabaseReady) {
    return (
      <div className="page-stub">
        <h1 className="h3">내 기록</h1>
        <p className="text-secondary">.env.local 에 Supabase 값이 아직 없어요.</p>
      </div>
    )
  }
  if (!authReady) return <div className="page-stub text-secondary">잠시만요…</div>
  if (!user) {
    return (
      <div className="page-stub">
        <h1 className="h3 mb-3">내 기록</h1>
        <AuthForm />
      </div>
    )
  }

  const name = user.user_metadata?.nickname || user.email

  return (
    <div className="page-stub">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h3 mb-0">{name}님의 기록</h1>
        <button type="button" className="chip" onClick={signOut}>
          로그아웃
        </button>
      </div>

      <div className="auth-card mb-4">
        <div className="mb-2 fw-semibold">지금 마음은 어떠세요?</div>
        <div className="d-flex gap-2 mb-2" role="radiogroup" aria-label="기분 고르기">
          {MOOD_LEVELS.map((m, i) => (
            <button
              key={m.emoji}
              type="button"
              role="radio"
              aria-checked={i === level}
              aria-label={m.label}
              className={`mood-tick ${i === level ? 'on' : ''}`}
              onClick={() => setLevel(i)}
            >
              <Emoji name={m.emoji} size="2rem" />
            </button>
          ))}
        </div>
        <div className="small text-secondary mb-2">{MOOD_LEVELS[level].label}</div>
        <label className="auth-field">
          한 줄 메모 <span className="text-secondary">(선택)</span>
          <input type="text" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="오늘은 어떤 하루였나요?" />
        </label>
        <button
          type="button"
          className="btn-soft"
          onClick={async () => {
            await addMoodLog({ emoji: MOOD_LEVELS[level].emoji, note: note.trim() })
            setNote('')
          }}
        >
          기록하기
        </button>
        <p className="small text-secondary mt-3 mb-0">기분은 점수가 아니라 이모지로만 남아요.</p>
      </div>

      <h2 className="h5">
        기록 목록 {moodLoading && <span className="spinner-border spinner-border-sm" />}
      </h2>
      <ul className="log-list">
        {!moodLoading && moodLogs.length === 0 && <li className="text-secondary">아직 기록이 없어요.</li>}
        {moodLogs.map((l) => {
          const m = labelOf(l.mood)
          return (
            <li key={l.id} className="log-item">
              {m ? <Emoji name={m.emoji} size="1.8rem" /> : <span>{l.mood}</span>}
              <div className="flex-grow-1">
                <div>
                  <strong>{m?.label}</strong> {l.note && <span>· {l.note}</span>}
                </div>
                <div className="small text-secondary">{new Date(l.created_at).toLocaleString('ko-KR')}</div>
              </div>
              <button type="button" className="chip" onClick={() => deleteMoodLog(l.id)} aria-label="이 기록 지우기">
                지우기
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
