import { useEffect, useState } from 'react'
import { isSupabaseReady } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

const MOODS = ['지침', '불안', '외로움', '설렘', '평온']

// STEP 2: Supabase 연결 확인용 화면 (마음 기록 쓰기 → 읽기)
export default function My() {
  const { nickname, setNickname, moodLogs, moodLoading, loadMoodLogs, addMoodLog } = useAppStore()
  const [mood, setMood] = useState(MOODS[0])
  const [note, setNote] = useState('')

  useEffect(() => {
    if (isSupabaseReady) loadMoodLogs()
  }, [nickname])

  return (
    <div className="page-stub">
      <h1>내 보관함</h1>
      <p className={isSupabaseReady ? 'text-success' : 'text-warning'}>
        Supabase 연결: {isSupabaseReady ? '설정됨' : '.env.local 값이 아직 없습니다'}
      </p>

      <div className="mb-3">
        <label className="form-label">닉네임</label>
        <input
          className="form-control"
          defaultValue={nickname}
          onBlur={(e) => setNickname(e.target.value)}
          placeholder="비워 두면 '익명'"
        />
      </div>

      <div className="mb-3">
        <label className="form-label">오늘의 마음 (연결 테스트용)</label>
        <div className="d-flex flex-wrap gap-2 mb-2">
          {MOODS.map((m) => (
            <button
              key={m}
              className={`btn btn-sm ${m === mood ? 'btn-warning' : 'btn-outline-secondary'}`}
              onClick={() => setMood(m)}
            >
              {m}
            </button>
          ))}
        </div>
        <input className="form-control mb-2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="한 줄 메모 (선택)" />
        <button
          className="btn btn-warning"
          onClick={async () => {
            await addMoodLog({ mood, note })
            setNote('')
          }}
        >
          기록하기
        </button>
      </div>

      <h2 className="h5">내 기록 {moodLoading && <span className="spinner-border spinner-border-sm" />}</h2>
      <ul className="list-group">
        {moodLogs.length === 0 && <li className="list-group-item text-secondary">아직 기록이 없어요</li>}
        {moodLogs.map((l) => (
          <li key={l.id} className="list-group-item">
            <strong>{l.mood}</strong> {l.note && <span>· {l.note}</span>}
            <div className="small text-secondary">{new Date(l.created_at).toLocaleString('ko-KR')}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
