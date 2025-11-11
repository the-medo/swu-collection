import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/limited/pool/$poolId/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/limited/pool/$poolId/"!</div>
}
