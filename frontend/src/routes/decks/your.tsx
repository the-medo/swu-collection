import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/decks/your')({
  component: YourDecks,
})

function YourDecks() {
  return (
    <div className="p-2">
      <h3>Welcome in your decks!</h3>
    </div>
  )
}
