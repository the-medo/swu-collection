import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/collections/$collectionId/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/collections/$collectionId/"!</div>
}
