import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/decks/$deckId/edit')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/decks/$deckId/edit"!</div>
}
