import { useEffect, useRef } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import ChatFab from '../components/ChatFab'
import Emoji from '../components/Emoji'
import { MongsumiFace } from '../components/Mongsumi'
import { useIsMobile } from '../lib/useIsMobile'
import { NAV_ITEMS } from '../router'
import { useAppStore } from '../store/useAppStore'

export default function RootLayout() {
  const toasts = useAppStore((s) => s.toasts)
  const initAuth = useAppStore((s) => s.initAuth)
  const mobile = useIsMobile()
  const chatOpen = useAppStore((s) => s.chatOpen)
  const setChatOpen = useAppStore((s) => s.setChatOpen)
  useEffect(() => initAuth(), [])
  // 모바일에서 떠 있는 하단 탭이 푸터 바로 위에 오도록 푸터 높이를 CSS 변수로 알려 준다
  const footRef = useRef(null)
  useEffect(() => {
    const el = footRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const set = () => document.documentElement.style.setProperty('--foot-h', `${el.offsetHeight}px`)
    set()
    const ro = new ResizeObserver(set)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const { pathname, hash } = useLocation()
  const here = pathname === '/' ? `/${hash || '#hero'}` : pathname

  return (
    <div className="app-shell">
      <header className="app-nav">
        <Link to="/#hero" className="brand">
          <i className="bi bi-tsunami" /> 느린 제주 <span>마음지도</span>
        </Link>
        <nav className="nav-links">
          {NAV_ITEMS.map((n) => (
            <Link key={n.to} to={n.to} className={`nav-link-item ${here === n.to ? 'active' : ''}`} aria-label={n.label} aria-current={here === n.to ? 'page' : undefined}>
              <Emoji name={n.emoji} size="1.3em" /> <span>{n.label}</span>
            </Link>
          ))}
          {mobile && (
            <button type="button" className={`nav-link-item nav-chat ${chatOpen ? 'active' : ''}`} onClick={() => setChatOpen((o) => !o)} aria-label={chatOpen ? '대화창 닫기' : '몽숨이 AI와 대화하기'} aria-pressed={chatOpen}>
              <MongsumiFace size="1.9rem" />
            </button>
          )}
        </nav>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="app-notice" ref={footRef}>
        이 앱은 의료·상담이 아닌 여행 추천입니다. 힘든 마음이 계속되면{' '}
        <br className="m-br" />
        109(자살예방상담전화){' '}
        <span className="foot-dot">· </span>1577-0199(정신건강상담전화)
        <span className="credit">
          <span className="credit-dot"> · </span>날씨 기상청 · 공기·일출·자외선 Open-Meteo · 섬 윤곽 © OpenStreetMap contributors</span>
      </footer>

      <ChatFab />

      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`alert alert-${t.variant} py-2 px-3 mb-2`}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  )
}
