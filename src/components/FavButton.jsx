import { useAppStore } from '../store/useAppStore'

// 찜 하트 버튼 (로그인한 본인만 저장된다)
export default function FavButton({ placeId, title, kind, address, lat, lng }) {
  const on = useAppStore((s) => !!s.favs[placeId])
  const toggleFav = useAppStore((s) => s.toggleFav)
  return (
    <button type="button" className={`chip fav ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggleFav({ placeId, title, kind, address, lat, lng })}>
      <i className={`bi ${on ? 'bi-heart-fill' : 'bi-heart'}`} /> 찜
    </button>
  )
}
