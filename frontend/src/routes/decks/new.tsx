import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/decks/new')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/decks/new"!</div>
}
