import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/wantlists/new')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/wantlists/new"!</div>
}
