import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import CrisisNotice from '../components/CrisisNotice'
import { hasCrisisSignal } from '../lib/crisis'
import { listTrips, photoUrls, removePhotos, saveTrip, updateTrip, uploadPhoto } from '../lib/reviews'
import { MAX_TEXT } from '../lib/tags'
import { isSupabaseReady } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })

// 여행 기록 쓰기: 내 동선의 장소마다 사진 한 장과 글(300자까지). 나만 볼 수 있다.
export default function TripWrite() {
  const { user, authReady, plan, toast } = useAppStore()
  const navigate = useNavigate()
  const editId = useSearchParams()[0].get('edit') // 있으면 이미 남긴 기록을 고친다
  const [date, setDate] = useState(today())
  const [items, setItems] = useState(() => (editId ? [] : plan.stops.map((s) => ({ title: s.title, text: '', file: null, preview: null, photo: null }))))
  const [loaded, setLoaded] = useState(!editId)
  const [busy, setBusy] = useState(false)
  const [crisis, setCrisis] = useState(false)

  useEffect(() => {
    if (!editId || !user) return
    listTrips()
      .then(async (rows) => {
        const t = rows.find((r) => String(r.id) === editId)
        if (!t) return setLoaded('missing')
        const entries = t.entries?.length ? t.entries : t.stops.map((x) => ({ title: x.title }))
        const urls = await photoUrls(entries.map((e) => e.photo)).catch(() => ({}))
        setDate(t.trip_date)
        setItems(entries.map((e) => ({ title: e.title, text: e.text || '', file: null, photo: e.photo || null, preview: e.photo ? urls[e.photo] || null : null })))
        setLoaded(true)
      })
      .catch(() => setLoaded('missing'))
  }, [editId, user?.id])

  useEffect(() => () => items.forEach((i) => i.preview && URL.revokeObjectURL(i.preview)), []) // 미리보기 주소 정리

  if (!isSupabaseReady) return <div className="page-stub text-secondary">Supabase 설정이 필요해요.</div>
  if (!authReady) return <div className="page-stub text-secondary">잠시만요…</div>
  if (!user) {
    return (
      <div className="page-stub">
        <Link to="/my">로그인</Link>한 뒤에 여행 기록을 남길 수 있어요.
      </div>
    )
  }
  if (editId && loaded === 'missing') {
    return (
      <div className="page-stub">
        <p className="text-secondary">이 기록을 찾지 못했어요.</p>
        <Link to="/my?tab=trips">나의 여행 기록으로</Link>
      </div>
    )
  }
  if (!loaded) return <div className="page-stub text-secondary">기록을 불러오는 중…</div>
  if (!editId && plan.stops.length === 0) {
    return (
      <div className="page-stub">
        <h1 className="h3">여행 기록 남기기</h1>
        <p className="text-secondary">기록할 동선이 없어요. 지도에서 동선을 만든 뒤 다시 와 주세요.</p>
        <Link to="/#explore" className="btn-soft d-inline-block text-decoration-none">
          지도로 가기
        </Link>
      </div>
    )
  }

  const patch = (i, p) => setItems((list) => list.map((it, idx) => (idx === i ? { ...it, ...p } : it)))
  const pick = (i, file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return toast('사진 파일만 올릴 수 있어요', 'warning')
    if (items[i].file && items[i].preview) URL.revokeObjectURL(items[i].preview)
    patch(i, { file, preview: URL.createObjectURL(file) })
  }
  const clearPhoto = (i) => {
    if (items[i].file && items[i].preview) URL.revokeObjectURL(items[i].preview)
    patch(i, { file: null, preview: null, photo: null })
  }

  const submit = async () => {
    if (!items.some((i) => i.text.trim() || i.file || i.photo)) return toast('사진이나 글을 하나 이상 남겨 주세요', 'warning')
    if (items.some((i) => hasCrisisSignal(i.text))) setCrisis(true)
    setBusy(true)
    const uploaded = []
    try {
      const entries = []
      for (const it of items) {
        const photo = it.file ? await uploadPhoto(it.file, user.id) : it.photo
        if (it.file && photo) uploaded.push(photo)
        entries.push({ title: it.title, text: it.text.trim(), photo })
      }
      if (editId) {
        const old = (await listTrips()).find((r) => String(r.id) === editId)
        await updateTrip({ id: editId, date, entries })
        const kept = new Set(entries.map((e) => e.photo))
        await removePhotos((old?.entries || []).map((e) => e.photo).filter((x) => x && !kept.has(x))).catch(() => {})
        toast('여행 기록을 고쳤어요')
      } else {
        await saveTrip({ date, entries, stops: plan.stops.map(({ title, kind, type, lat, lng }) => ({ title, kind, type, lat, lng })) })
        toast('여행을 기록했어요')
      }
      navigate('/my?tab=trips')
    } catch (e) {
      toast(e.message || '저장하지 못했어요', 'danger')
      setBusy(false)
    }
  }

  return (
    <div className="page-stub">
      <h1 className="h3 mb-1">{editId ? '여행 기록 고치기' : '여행 기록 남기기'}</h1>
      <p className="small text-secondary">장소마다 사진 한 장과 글을 남겨 보세요. 나만 볼 수 있어요.</p>

      <label className="auth-field">
        여행한 날
        <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
      </label>

      <ol className="trip-write">
        {items.map((it, i) => (
          <li key={it.title} className="trip-entry">
            <div className="fw-semibold mb-1">
              <span className="season-no">{i + 1}</span> {it.title}
            </div>
            {it.preview ? (
              <div className="trip-photo">
                <img src={it.preview} alt={`${it.title} 사진 미리보기`} />
                <button type="button" className="chip" onClick={() => clearPhoto(i)}>
                  사진 빼기
                </button>
              </div>
            ) : (
              <label className="photo-pick">
                <i className="bi bi-camera" /> 사진 올리기
                <input type="file" accept="image/*" hidden onChange={(e) => pick(i, e.target.files?.[0])} />
              </label>
            )}
            <textarea
              value={it.text}
              maxLength={MAX_TEXT}
              rows={3}
              onChange={(e) => patch(i, { text: e.target.value })}
              placeholder="이곳은 어땠나요?"
              aria-label={`${it.title}에 대한 글`}
            />
            <div className="small text-secondary text-end">
              {it.text.length}/{MAX_TEXT}
            </div>
          </li>
        ))}
      </ol>

      {crisis && <CrisisNotice />}
      <div className="d-flex gap-2 mt-3">
        <button type="button" className="btn-soft" onClick={submit} disabled={busy}>
          {busy ? '저장 중…' : editId ? '고친 내용 저장하기' : '기록 저장하기'}
        </button>
        <Link to={editId ? '/my?tab=trips' : '/#explore'} className="chip text-decoration-none">
          돌아가기
        </Link>
      </div>
    </div>
  )
}
