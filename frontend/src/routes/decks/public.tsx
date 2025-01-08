import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/decks/public')({
  component: PublicDecks,
})

function PublicDecks() {
  return (
    <div className="p-2">
      <h3>Welcome in public decks!</h3>
    </div>
  )
}
