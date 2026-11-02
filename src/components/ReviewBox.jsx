import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import CitrusRating from './CitrusRating'
import CrisisNotice from './CrisisNotice'
import TagPicker from './TagPicker'
import { hasCrisisSignal } from '../lib/crisis'
import { deleteReview, listReviews, saveReview } from '../lib/reviews'
import { MAX_TEXT } from '../lib/tags'
import { isSupabaseReady } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

// 장소 리뷰: 누구나 읽고, 로그인한 사람만 쓴다 (감귤 별점 · 이야기 300자 · 해시태그)
export default function ReviewBox({ placeId, title }) {
  const user = useAppStore((s) => s.user)
  const toast = useAppStore((s) => s.toast)
  const [reviews, setReviews] = useState(null)
  const [rating, setRating] = useState(0)
  const [body, setBody] = useState('')
  const [tags, setTags] = useState([])
  const [busy, setBusy] = useState(false)
  const [crisis, setCrisis] = useState(false)
  const [editing, setEditing] = useState(false)

  const mine = reviews?.find((r) => r.user_id === user?.id)
  const others = (reviews || []).filter((r) => r.id !== mine?.id)

  const load = () => listReviews(placeId).then(setReviews).catch(() => setReviews([]))
  useEffect(() => {
    setReviews(null)
    setEditing(false)
    setCrisis(false)
    if (isSupabaseReady) load()
    else setReviews([])
  }, [placeId])

  const startEdit = () => {
    setRating(mine?.rating || 0)
    setBody(mine?.body || '')
    setTags(mine?.tags || [])
    setCrisis(false)
    setEditing(true)
  }

  const submit = async () => {
    if (!rating) return toast('감귤을 눌러 별점을 남겨 주세요', 'warning')
    if (!body.trim()) return toast('이야기를 한 줄 적어 주세요', 'warning')
    // 공개되는 글이므로 위험 문구가 있으면 올리지 않고 연락처를 먼저 보여 준다
    if (hasCrisisSignal(body)) return setCrisis(true)
    setBusy(true)
    try {
      await saveReview({ placeId, title, rating, body: body.trim(), tags, nickname: user.user_metadata?.nickname || '익명' })
      toast('리뷰를 남겼어요')
      setEditing(false)
      await load()
    } catch (e) {
      toast(e.message, 'danger')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    try {
      await deleteReview(mine.id)
      setEditing(false)
      await load()
    } catch (e) {
      toast(e.message, 'danger')
    }
  }

  const rated = (reviews || []).filter((r) => r.rating)
  const avg = rated.length ? rated.reduce((a, r) => a + r.rating, 0) / rated.length : 0

  return (
    <section className="reviews">
      <h3 className="h6 mb-1">리뷰 {reviews && `(${reviews.length})`}</h3>
      {rated.length > 0 && (
        <div className="review-avg">
          <CitrusRating value={avg} size="1.3rem" /> <strong>{avg.toFixed(1)}</strong>
        </div>
      )}

      {reviews === null && <div className="small text-secondary">불러오는 중…</div>}
      {reviews && reviews.length === 0 && <div className="small text-secondary">아직 리뷰가 없어요. 첫 이야기를 남겨 보세요.</div>}

      {mine && !editing && <ReviewItem r={mine} mine onEdit={startEdit} onDelete={remove} />}
      {others.map((r) => (
        <ReviewItem key={r.id} r={r} />
      ))}

      {!isSupabaseReady ? null : !user ? (
        <p className="small text-secondary mt-2">
          <Link to="/my">로그인</Link>하면 리뷰를 남길 수 있어요.
        </p>
      ) : !mine && !editing ? (
        <button type="button" className="btn-soft mt-2" onClick={startEdit}>
          리뷰 남기기
        </button>
      ) : editing ? (
        <div className="review-form">
          <CitrusRating value={rating} onChange={setRating} />
          <textarea value={body} maxLength={MAX_TEXT} rows={3} onChange={(e) => setBody(e.target.value)} placeholder="이곳은 어땠나요? 나만의 이야기를 적어 주세요" aria-label="리뷰 내용" />
          <div className="small text-secondary text-end">
            {body.length}/{MAX_TEXT}
          </div>
          <TagPicker value={tags} onChange={setTags} />
          {crisis && (
            <CrisisNotice>
              <div className="small">이 글은 모두에게 보이는 리뷰로 올리지 않았어요. 오늘의 마음은 “내 기록”에 따로 남길 수 있어요.</div>
            </CrisisNotice>
          )}
          <div className="d-flex gap-2 mt-2">
            <button type="button" className="btn-soft" onClick={submit} disabled={busy}>
              {busy ? '저장 중…' : '남기기'}
            </button>
            <button type="button" className="chip" onClick={() => setEditing(false)}>
              취소
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function ReviewItem({ r, mine, onEdit, onDelete }) {
  return (
    <div className={`review-item ${mine ? 'mine' : ''}`}>
      <div className="d-flex justify-content-between align-items-center">
        <span className="small">
          <strong>{r.nickname}</strong>
          {mine && ' (나)'} · {new Date(r.created_at).toLocaleDateString('ko-KR')}
        </span>
        {r.rating && <CitrusRating value={r.rating} size="1.1rem" />}
      </div>
      <p className="mb-1">{r.body}</p>
      {r.tags?.length > 0 && <div className="review-tags">{r.tags.map((t) => `#${t}`).join(' ')}</div>}
      {mine && (
        <div className="d-flex gap-2 mt-1">
          <button type="button" className="chip" onClick={onEdit}>
            고치기
          </button>
          <button type="button" className="chip" onClick={onDelete}>
            지우기
          </button>
        </div>
      )}
    </div>
  )
}
