export function LoadingSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="stack" aria-busy="true">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton" style={{ width: `${100 - i * 15}%` }} />
      ))}
    </div>
  )
}
