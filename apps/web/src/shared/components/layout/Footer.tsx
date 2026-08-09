export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border px-4 py-3 text-xs text-muted-foreground md:px-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p>Harry OS · Personal Life Operating System</p>
        <p>© {year}</p>
      </div>
    </footer>
  )
}
