import { NavLink, Outlet } from 'react-router-dom'
import { NAV_ITEMS } from '../router'
import { useAppStore } from '../store/useAppStore'

export default function RootLayout() {
  const toasts = useAppStore((s) => s.toasts)

  return (
    <div className="app-shell">
      <header className="app-nav">
        <NavLink to="/" className="brand">
          <i className="bi bi-tsunami" /> 느린 제주 <span>마음지도</span>
        </NavLink>
        <nav className="nav-links">
          {NAV_ITEMS.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className="nav-link-item">
              <i className={`bi bi-${n.icon}`} /> <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="app-notice">
        이 앱은 의료·상담이 아닌 여행 추천입니다. 힘든 마음이 계속되면 109(자살예방상담) · 1577-0199(정신건강상담)
      </footer>

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
