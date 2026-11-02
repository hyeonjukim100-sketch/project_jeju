import { createBrowserRouter } from 'react-router-dom'
import RootLayout from './layouts/RootLayout'
import Home from './pages/Home'
import My from './pages/My'
import TripWrite from './pages/TripWrite'
import NotFound from './pages/NotFound'

// 메뉴 + 주소 목록. 첫 화면 안의 구역은 hash(#) 로 이동한다.
export const NAV_ITEMS = [
  { to: '/#hero', label: '오늘의 마음', emoji: 'smile' },
  { to: '/#explore', label: '날씨·지도', emoji: 'partly' },
  { to: '/my', label: '나의 여행 기록', emoji: 'camera' },
]

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Home /> },
      { path: 'my', element: <My /> },
      { path: 'trip/new', element: <TripWrite /> },
    ],
  },
])
