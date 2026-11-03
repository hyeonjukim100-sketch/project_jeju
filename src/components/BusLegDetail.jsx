import { useState } from 'react'
import { fetchBusLeg } from '../api/client'

export const BUS_URL = 'https://bus.jeju.go.kr' // 제주버스정보시스템 (배차 간격·도착 시각)
const TIMEOUT = 15000 // 서버가 8초 안에 답하지만, 그래도 안 오면 안내 문구로 넘어간다

const isPoint = (p) => Number.isFinite(Number(p?.lat)) && Number.isFinite(Number(p?.lng))
const point = (p) => ({ lat: Number(p.lat), lng: Number(p.lng) })

// 버스 이동 줄 옆의 "세부정보" 탭. 처음 열 때 한 번만 불러오고, 다시 누르면 접힌다.
export default function BusLegDetail({ from, to }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('idle') // idle | loading | done
  const [options, setOptions] = useState([])

  const load = () => {
    if (!isPoint(from) || !isPoint(to)) {
      setStatus('done')
      return
    }
    setStatus('loading')
    Promise.race([fetchBusLeg(point(from), point(to)), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), TIMEOUT))])
      .then((r) => setOptions(r.options || []))
      .catch(() => setOptions([]))
      .finally(() => setStatus('done'))
  }
  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next && status === 'idle') load()
  }

  return (
    <>
      <button type="button" className="chip bus-detail-btn" aria-expanded={open} onClick={toggle}>
        세부정보 <i className={`bi bi-chevron-${open ? 'up' : 'right'}`} />
      </button>
      {open && (
        <div className="bus-detail" role="region" aria-label="버스 세부정보">
          {status !== 'done' && <div className="bus-detail-note">버스를 찾는 중…</div>}
          {status === 'done' && options.length > 0 && (
            <ul className="bus-opts">
              {options.map((o) => (
                <li key={o.number} className="bus-opt">
                  <div className="bus-opt-head">
                    <b>{o.number}번</b> 버스 <small>· {o.stops}개 정류장</small>
                    {o.nextMin != null && <small> · 다음 버스 약 {o.nextMin}분 뒤</small>}
                  </div>
                  <div className="bus-opt-stops">
                    {o.board.name} <small>(걸어서 {o.board.meters}m)</small> <i className="bi bi-arrow-right" /> {o.alight.name} <small>(걸어서 {o.alight.meters}m)</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {status === 'done' && options.length === 0 && (
            <div className="bus-detail-note">
              직접 가는 버스를 찾지 못했어요. 환승이 필요할 수 있어요.{' '}
              <a href={BUS_URL} target="_blank" rel="noreferrer">
                제주버스정보시스템 <i className="bi bi-box-arrow-up-right" />
              </a>
            </div>
          )}
        </div>
      )}
    </>
  )
}
