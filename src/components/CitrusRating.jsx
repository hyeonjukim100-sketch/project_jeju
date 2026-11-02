import Emoji from './Emoji'

// 감귤 별점 (1~5, 1개 단위). onChange 가 있으면 고를 수 있고, 없으면 보여 주기만 한다.
export default function CitrusRating({ value = 0, onChange, size = '1.6rem' }) {
  const label = `감귤 ${value}개`
  if (!onChange) {
    return (
      <span className="citrus" role="img" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Emoji key={n} name="tangerine" size={size} className={n <= Math.round(value) ? '' : 'dim'} />
        ))}
      </span>
    )
  }
  return (
    <div className="citrus" role="radiogroup" aria-label="감귤 별점">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={n === value} aria-label={`감귤 ${n}개`} className="citrus-btn" onClick={() => onChange(n)}>
          <Emoji name="tangerine" size={size} className={n <= value ? '' : 'dim'} />
        </button>
      ))}
    </div>
  )
}
