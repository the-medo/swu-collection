import { createFileRoute } from '@tanstack/react-router'
import CardPoolDetail from '@/components/app/limited/CardPoolDetail/CardPoolDetail.tsx'

export const Route = createFileRoute('/limited/pool/$poolId/detail/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { poolId } = Route.useParams()
  return <CardPoolDetail poolId={poolId} />
}
