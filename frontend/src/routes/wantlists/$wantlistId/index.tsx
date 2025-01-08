import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/wantlists/$wantlistId/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/wantlists/$wantlistId/"!</div>
}
