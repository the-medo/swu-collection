import { createFileRoute } from '@tanstack/react-router'
import { AdminPage } from '@/components/app/admin/AdminPage'

export const Route = createFileRoute('/admin')({
  component: AdminPage,
})
