import { useAppStore } from '../store/useAppStore'

// 임시 캐릭터 자리 — 사용자가 3D 모델(.glb)을 보내 주면 교체. 표정만 슬라이더에 따라 바뀐다.
export default function CharacterStone() {
  const level = useAppStore((s) => s.moodLevel)
  return (
    <div className="char" data-level={level} role="img" aria-label="캐릭터 자리 (임시)">
      <div className="char-stone">
        <span className="char-eye l" />
        <span className="char-eye r" />
        <span className="char-mouth" />
        <span className="char-cheek l" />
        <span className="char-cheek r" />
      </div>
      <div className="char-shadow" />
      <div className="char-note">캐릭터 모델이 들어올 자리예요</div>
    </div>
  )
}
