import type { ModuleManifest } from "@/features/modules/types"
import { reviewChrome, KNOWLEDGE_SECTIONS } from "@/features/modules/manifests/reviewSections"
import { booksManifest } from "@/features/modules/manifests/books"

/** Inbox stays visually calm — reuse knowledge calm tokens with inbox copy. */
export const inboxManifest: ModuleManifest = {
  ...booksManifest,
  id: "inbox",
  name: "Knowledge Inbox",
  shortName: "Inbox",
  tagline: "Classify later",
  parserType: "general",
  destinationModule: "inbox",
  ready: true,
  route: "/ai/knowledge/inbox",
  identity: { icon: "Inbox", mood: "inbox" },
  theme: {
    mode: "inherit",
    tokens: {
      ...booksManifest.theme.tokens,
      accent: "hsl(38 92% 55%)",
      accentSoft: "rgba(245, 158, 11, 0.12)",
      glow: "rgba(245, 158, 11, 0.1)",
      progress: "rgba(245, 158, 11, 0.65)",
      card: "hsl(var(--card) / 0.55)",
      border: "rgba(255,255,255,0.08)",
      fg: "hsl(var(--foreground))",
      muted: "hsl(var(--muted-foreground))",
      paper: "transparent",
    },
  },
  import: {
    ...booksManifest.import,
    upload: {
      ...booksManifest.import.upload,
      eyebrow: "AI · Inbox",
      title: "Knowledge Inbox",
      description: "Deferred imports wait here until you choose a destination.",
    },
    review: reviewChrome({
      title: "Inbox item",
      description: "Choose a destination when ready.",
      draftHeading: "Draft",
      imagesHeading: "Original Notebook",
      saveLabel: "Save to Inbox",
      successTitle: "Saved to Inbox",
      successCta: "Open Inbox",
      successRoute: "/ai/knowledge/inbox",
    }),
  },
  review: {
    ...booksManifest.review,
    layout: "notes-clean",
    sections: KNOWLEDGE_SECTIONS,
  },
  surfaces: {
    headerStyle: "minimal",
    navStyle: "airy",
    dashboardWidgets: [],
  },
}
