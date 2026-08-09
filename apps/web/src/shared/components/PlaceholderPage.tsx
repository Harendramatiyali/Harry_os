import { PageHeader } from "@/shared/components/layout/PageHeader"
import { EmptyState } from "@/shared/components/EmptyState"

type PlaceholderPageProps = {
  title: string
  description?: string
}

/** Shell page — no business logic or API calls. */
export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div>
      <PageHeader
        title={title}
        description={description ?? "Module shell only. Business logic not implemented yet."}
      />
      <EmptyState
        title={`${title} coming soon`}
        description="Reusable layout and UI are ready. Domain features will be added in later phases."
      />
    </div>
  )
}
