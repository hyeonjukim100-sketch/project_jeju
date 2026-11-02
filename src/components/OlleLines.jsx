// 올레길 지도 선 — 지금은 꺼 두었다 (어디서도 불러오지 않는다).
// 이유: OpenStreetMap 에는 29개 코스 중 12개 코스의 선만 믿을 만하게 있어서, 일부 코스에만 선이 보이면 어색하기 때문.
// 공식 경로 자료(GPX 등)를 구해 전체 코스를 채우게 되면 다시 켠다:
//   1) src/data/olle-lines.json 에 코스 번호별 { segs: [[[경도, 위도], ...], ...] } 를 채우고
//   2) JejuMap3D.jsx 에서 이 컴포넌트를 불러와 <Canvas> 안에 <OlleLines /> 를 넣는다.
import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import olleLines from '../data/olle-lines.json'
import { useAppStore } from '../store/useAppStore'
import { toScene } from './JejuMap3D'

// 올레코스 칩에서 고른 코스만 굵게 그린다
export default function OlleLines() {
  // 카드에서 고른 값은 "번호|이름" 모양이라 번호만 뗀다 (3코스 A/B 는 같은 선을 쓴다)
  const selected = useAppStore((s) => s.selectedOlle)?.split('|')[0] ?? null
  // 코스마다 여러 조각(segs)이다 — 끊긴 곳에는 선을 긋지 않는다
  const lines = useMemo(
    () =>
      Object.entries(olleLines).map(([id, v]) => [
        id,
        v.segs.map((seg) =>
          seg.map(([lng, lat]) => {
            const [x, y, z] = toScene(lng, lat)
            return [x, y + 0.05, z]
          }),
        ),
      ]),
    [],
  )
  if (!selected) return null
  return (
    <group>
      {lines.map(([id, segs]) => {
        const on = id === selected
        if (!on) return null
        return segs.map((pts, i) => (
          <Line key={`${id}-${i}`} points={pts} color={on ? '#E8590C' : '#2F9E6B'} lineWidth={on ? 5 : 2} transparent opacity={on || !selected ? 1 : 0.45} />
        ))
      })}
    </group>
  )
}
