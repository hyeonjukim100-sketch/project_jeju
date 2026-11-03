import { useAppStore } from '../store/useAppStore'

// 찜 하트 버튼 (로그인한 본인만 저장된다)
// variant="round": 글자 없이 하트만 있는 동그란 버튼 (사진 위에 얹는 용)
export default function FavButton({ placeId, title, kind, address, lat, lng, variant = 'chip' }) {
  const on = useAppStore((s) => !!s.favs[placeId])
  const toggleFav = useAppStore((s) => s.toggleFav)
  if (variant === 'round') {
    return (
      <button type="button" className={`round-btn fav ${on ? 'on' : ''}`} aria-label="찜" aria-pressed={on} onClick={() => toggleFav({ placeId, title, kind, address, lat, lng })}>
        <i className={`bi ${on ? 'bi-heart-fill' : 'bi-heart'}`} />
      </button>
    )
  }
  return (
    <button type="button" className={`chip fav ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggleFav({ placeId, title, kind, address, lat, lng })}>
      <i className={`bi ${on ? 'bi-heart-fill' : 'bi-heart'}`} /> 찜
    </button>
  )
}
