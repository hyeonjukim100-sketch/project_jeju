import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import ChatFab from '../components/ChatFab'
import Emoji from '../components/Emoji'
import { NAV_ITEMS } from '../router'
import { useAppStore } from '../store/useAppStore'

export default function RootLayout() {
  const toasts = useAppStore((s) => s.toasts)
  const initAuth = useAppStore((s) => s.initAuth)
  useEffect(() => initAuth(), [])
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
            <Link key={n.to} to={n.to} className={`nav-link-item ${here === n.to ? 'active' : ''}`}>
              <Emoji name={n.emoji} size="1.3em" /> <span>{n.label}</span>
            </Link>
          ))}
        </nav>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="app-notice">
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
