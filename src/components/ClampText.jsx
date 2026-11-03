import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// 긴 글은 lines 줄까지만 보여 주고 "더보기"로 펼친다. 실제로 넘칠 때만 버튼이 나온다.
export default function ClampText({ text, lines = 3 }) {
  const ref = useRef(null)
  const [open, setOpen] = useState(false)
  const [overflow, setOverflow] = useState(false)

  useEffect(() => setOpen(false), [text])
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const measure = () => {
      if (!open) setOverflow(el.scrollHeight > el.clientHeight + 1)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [text, lines, open])

  if (!text) return null
  return (
    <div>
      <p ref={ref} className={`spot-intro clamp-text ${open ? 'open' : ''}`} style={{ '--lines': lines }}>
        {text}
      </p>
      {(overflow || open) && (
        <button type="button" className="clamp-more" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? '접기' : '더보기'} <i className={`bi bi-chevron-${open ? 'up' : 'down'}`} />
        </button>
      )}
    </div>
  )
}
