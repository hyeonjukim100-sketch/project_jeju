import { createBrowserRouter } from 'react-router-dom'
import RootLayout from './layouts/RootLayout'
import MapPage from './pages/MapPage'
import Plan from './pages/Plan'
import Festivals from './pages/Festivals'
import Agent from './pages/Agent'
import My from './pages/My'
import NotFound from './pages/NotFound'

// 메뉴 + 주소 목록. 페이지 추가: ① pages/ 에 파일 ② NAV_ITEMS 한 줄 ③ routes 한 줄
export const NAV_ITEMS = [
  { to: '/', label: '3D 지도', icon: 'globe-asia-australia' },
  { to: '/plan', label: '하루 동선', icon: 'signpost-split' },
  { to: '/festivals', label: '축제', icon: 'stars' },
  { to: '/agent', label: 'AI 가이드', icon: 'chat-dots' },
  { to: '/my', label: '내 보관함', icon: 'bookmark-heart' },
]

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <MapPage /> },
      { path: 'plan', element: <Plan /> },
      { path: 'festivals', element: <Festivals /> },
      { path: 'agent', element: <Agent /> },
      { path: 'my', element: <My /> },
    ],
  },
])
