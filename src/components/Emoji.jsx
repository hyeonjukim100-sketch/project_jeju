// Fluent Emoji 3D (Microsoft, MIT) — public/emoji/<name>.png
export default function Emoji({ name, size = '1.25em', className = '' }) {
  return (
    <img
      src={`/emoji/${name}.png`}
      alt=""
      aria-hidden="true"
      className={`emoji ${className}`}
      style={{ width: size, height: size }}
      draggable="false"
    />
  )
}
