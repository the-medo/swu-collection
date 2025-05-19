import { createFileRoute } from '@tanstack/react-router'
import { Helmet } from 'react-helmet-async'

export const Route = createFileRoute('/wantlists/$wantlistId/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <Helmet title="Wantlist Details | SWUBase" />
      <div>Hello "/wantlists/$wantlistId/"!</div>
    </>
  )
}
