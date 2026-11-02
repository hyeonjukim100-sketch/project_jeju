import { createBrowserRouter } from 'react-router-dom'
import RootLayout from './layouts/RootLayout'
import Home from './pages/Home'
import My from './pages/My'
import NotFound from './pages/NotFound'

// 메뉴 + 주소 목록. 첫 화면 안의 구역은 hash(#) 로 이동한다.
export const NAV_ITEMS = [
  { to: '/#hero', label: '오늘의 마음', icon: 'emoji-smile' },
  { to: '/#explore', label: '날씨·지도', icon: 'map' },
  { to: '/my', label: '내 기록', icon: 'journal-text' },
]

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Home /> },
      { path: 'my', element: <My /> },
    ],
  },
])
