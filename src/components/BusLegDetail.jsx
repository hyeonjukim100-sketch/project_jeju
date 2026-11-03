import { useState } from 'react'
import { fetchBusLeg } from '../api/client'
import { busMeta, moreLabel } from '../lib/busText'

export const BUS_URL = 'https://bus.jeju.go.kr' // 제주버스정보시스템 (배차 간격·도착 시각)
const TIMEOUT = 25000 // 서버가 느릴 때 몇 번 재시도하므로 넉넉히 기다리고, 그래도 안 오면 안내 문구로 넘어간다

const isPoint = (p) => Number.isFinite(Number(p?.lat)) && Number.isFinite(Number(p?.lng))
const point = (p) => ({ lat: Number(p.lat), lng: Number(p.lng) })

// 버스 이동 줄 옆의 "세부정보" 탭. 처음 열 때 한 번만 불러오고, 다시 누르면 접힌다.
export default function BusLegDetail({ from, to }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('idle') // idle | loading | done
  const [options, setOptions] = useState([])
  const [expanded, setExpanded] = useState(false) // 처음엔 버스 1개만, "더 보기"로 나머지

  const load = () => {
    if (!isPoint(from) || !isPoint(to)) {
      setStatus('done')
      return
    }
    setStatus('loading')
    Promise.race([fetchBusLeg(point(from), point(to)), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), TIMEOUT))])
      .then((r) => {
        setOptions(r.options || [])
        setStatus('done')
      })
      .catch(() => setStatus('error')) // 잠깐의 끊김일 수 있으니 다시 눌러 불러올 수 있게 둔다
  }
  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next && (status === 'idle' || status === 'error')) load()
  }

  return (
    <>
      <button type="button" className="chip bus-detail-btn" aria-expanded={open} onClick={toggle}>
        세부정보 <i className={`bi bi-chevron-${open ? 'up' : 'right'}`} />
      </button>
      {open && (
        <div className="bus-detail" role="region" aria-label="버스 세부정보">
          {(status === 'idle' || status === 'loading') && <div className="bus-detail-note">버스를 찾는 중…</div>}
          {status === 'error' && (
            <div className="bus-detail-note">
              버스 정보를 불러오지 못했어요.{' '}
              <button type="button" className="bus-retry" onClick={load}>
                다시 찾기
              </button>
            </div>
          )}
          {status === 'done' && options.length > 0 && (
            <>
              <ul className="bus-opts">
                {(expanded ? options : options.slice(0, 1)).map((o) => (
                  <li key={o.number} className="bus-opt">
                    <div className="bus-opt-num">{o.number}번</div>
                    <div className="bus-opt-meta">{busMeta(o)}</div>
                    <div className="bus-opt-stops">
                      {o.board.name} <small>(걸어서 {o.board.meters}m)</small> <i className="bi bi-arrow-right" /> {o.alight.name} <small>(걸어서 {o.alight.meters}m)</small>
                    </div>
                  </li>
                ))}
              </ul>
              {options.length > 1 && (
                <button type="button" className="bus-more" aria-expanded={expanded} onClick={() => setExpanded((e) => !e)}>
                  {moreLabel(options.length, expanded)} <i className={`bi bi-chevron-${expanded ? 'up' : 'down'}`} />
                </button>
              )}
            </>
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
