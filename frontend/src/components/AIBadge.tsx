export function AIBadge({ cached }: { cached?: boolean }) {
  return (
    <span className="ai-badge" title={cached ? 'AI-generated (cached)' : 'AI-generated'}>
      ✨ AI-generated
    </span>
  )
}
