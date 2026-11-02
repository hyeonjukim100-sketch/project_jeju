import { useState } from 'react'
import { Link } from 'react-router-dom'
import CrisisNotice from './CrisisNotice'
import Emoji from './Emoji'
import TagPicker from './TagPicker'
import { hasCrisisSignal } from '../lib/crisis'
import { MOOD_LEVELS } from '../lib/moods'
import { saveTrip } from '../lib/reviews'
import { MAX_TEXT } from '../lib/tags'
import { isSupabaseReady } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

// 하루가 끝나면 남기는 여행 기록: 오늘의 동선 + 이모지 기분 + 한 줄 + 해시태그 (본인만 볼 수 있다, 점수는 저장하지 않는다)
export default function TripRecord() {
  const user = useAppStore((s) => s.user)
  const stops = useAppStore((s) => s.plan.stops)
  const toast = useAppStore((s) => s.toast)
  const [open, setOpen] = useState(false)
  const [level, setLevel] = useState(2)
  const [note, setNote] = useState('')
  const [tags, setTags] = useState([])
  const [busy, setBusy] = useState(false)
  const [crisis, setCrisis] = useState(false)

  if (!isSupabaseReady || stops.length === 0) return null
  if (!user) {
    return (
      <p className="small text-secondary mt-3">
        <Link to="/my">로그인</Link>하면 오늘의 여행을 기록으로 남길 수 있어요.
      </p>
    )
  }
  if (!open) {
    return (
      <button type="button" className="btn-soft w-100 mt-3" onClick={() => setOpen(true)}>
        오늘 여행 기록하기
      </button>
    )
  }

  const submit = async () => {
    // 내 기록은 본인만 보므로 저장은 막지 않고, 위험 문구가 있으면 연락처를 먼저 보여 준다
    if (hasCrisisSignal(note)) setCrisis(true)
    setBusy(true)
    try {
      await saveTrip({
        mood: MOOD_LEVELS[level].emoji,
        note: note.trim(),
        tags,
        stops: stops.map(({ title, kind, type, lat, lng }) => ({ title, kind, type, lat, lng })),
      })
      toast('오늘의 여행을 기록했어요')
      if (!hasCrisisSignal(note)) setOpen(false)
      setNote('')
      setTags([])
    } catch (e) {
      toast(e.message, 'danger')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="trip-form">
      <div className="fw-semibold mb-1">오늘 하루는 어땠나요?</div>
      <div className="d-flex gap-1 mb-1" role="radiogroup" aria-label="오늘의 기분">
        {MOOD_LEVELS.map((m, i) => (
          <button key={m.emoji} type="button" role="radio" aria-checked={i === level} aria-label={m.label} className={`mood-tick ${i === level ? 'on' : ''}`} onClick={() => setLevel(i)}>
            <Emoji name={m.emoji} size="1.8rem" />
          </button>
        ))}
      </div>
      <div className="small text-secondary mb-2">{MOOD_LEVELS[level].label}</div>
      <textarea value={note} maxLength={MAX_TEXT} rows={3} onChange={(e) => setNote(e.target.value)} placeholder="오늘의 이야기를 남겨 보세요 (선택)" aria-label="오늘의 이야기" />
      <div className="small text-secondary text-end">
        {note.length}/{MAX_TEXT}
      </div>
      <TagPicker value={tags} onChange={setTags} />
      {crisis && <CrisisNotice />}
      <div className="d-flex gap-2 mt-2">
        <button type="button" className="btn-soft" onClick={submit} disabled={busy}>
          {busy ? '저장 중…' : '기록하기'}
        </button>
        <button type="button" className="chip" onClick={() => setOpen(false)}>
          닫기
        </button>
      </div>
      <p className="small text-secondary mt-2 mb-0">나만 볼 수 있어요. 기분은 점수가 아니라 이모지로만 남아요.</p>
    </div>
  )
}
