import { PageHeader } from "@/shared/components/layout/PageHeader"
import { EmptyState } from "@/shared/components/EmptyState"
import { Badge } from "@/shared/ui/badge"

export function AdminPage() {
  return (
    <div>
      <PageHeader
        title="Admin"
        description="Admin-only area. Role checks are enforced on both frontend and API."
      />
      <EmptyState
        title="Admin console"
        description="Placeholder for future admin tools."
        action={<Badge>role: admin</Badge>}
      />
    </div>
  )
}
