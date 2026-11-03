import { useEffect, useRef, useState } from 'react'

// 칩 목록. 모바일에서는 옆으로 밀어서 보고, 더 있는 쪽 끝에 흐림과 화살표로 알려 준다. 넓은 화면에서는 줄바꿈.
export default function ChipSlider({ children }) {
  const ref = useRef(null)
  const [edge, setEdge] = useState({ left: false, right: false })

  const measure = () => {
    const el = ref.current
    if (!el) return
    setEdge({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 })
  }
  useEffect(() => {
    measure()
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [children])

  const nudge = (dir) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.6, behavior: 'smooth' })

  return (
    <div className={`chip-slider ${edge.left ? 'has-left' : ''} ${edge.right ? 'has-right' : ''}`}>
      <div className="kind-chips chip-slider-track" ref={ref} onScroll={measure}>
        {children}
      </div>
      <button type="button" className="chip-slider-arrow left" onClick={() => nudge(-1)} aria-label="이전 분류 보기" tabIndex={-1}>
        <i className="bi bi-chevron-left" />
      </button>
      <button type="button" className="chip-slider-arrow right" onClick={() => nudge(1)} aria-label="다음 분류 보기" tabIndex={-1}>
        <i className="bi bi-chevron-right" />
      </button>
    </div>
  )
}
