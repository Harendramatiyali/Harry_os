import type { ModuleManifest } from "@/features/modules/types"
import { reviewChrome, KNOWLEDGE_SECTIONS } from "@/features/modules/manifests/reviewSections"

const neutralTokens = {
  bg: "transparent",
  fg: "hsl(var(--foreground))",
  muted: "hsl(var(--muted-foreground))",
  card: "hsl(var(--card) / 0.55)",
  border: "rgba(255,255,255,0.08)",
  accent: "hsl(199 89% 74%)",
  accentSoft: "rgba(56, 189, 248, 0.12)",
  positive: "hsl(152 60% 45%)",
  negative: "hsl(0 62% 55%)",
  warning: "hsl(38 92% 50%)",
  paper: "transparent",
  glow: "rgba(148, 163, 184, 0.12)",
  progress: "rgba(125, 211, 252, 0.7)",
  radius: "1.5rem",
} as const

export const neutralManifest: ModuleManifest = {
  id: "neutral",
  name: "Import",
  shortName: "Import",
  tagline: "AI Knowledge Import",
  parserType: "general",
  destinationModule: "inbox",
  ready: true,
  identity: { icon: "Sparkles", mood: "import" },
  theme: { mode: "inherit", tokens: { ...neutralTokens } },
  import: {
    upload: {
      eyebrow: "AI · Import",
      title: "Import",
      description: "Drop page photos, confirm they’re readable, then let AI understand the document.",
      dropTitle: "Drop notebook pages",
      dropHint: "PNG, JPG, or HEIC · multiple pages welcome",
      sessionLabel: "Session title",
      sessionPlaceholder: "Optional · e.g. Monday session",
      addImagesLabel: "Add images",
      changeImagesLabel: "Change images",
      processLabel: "Generate Preview",
      reprocessLabel: "Re-process & Continue",
    },
    understand: {
      title: "What is this?",
      description: "AI suggests a destination. You confirm before reviewing.",
    },
    review: reviewChrome({
      title: "Review Import",
      description: "Edit the structured draft, then save to the confirmed destination.",
      draftHeading: "Structured draft",
      imagesHeading: "Original Notebook",
      saveLabel: "Save",
      successTitle: "Successfully Saved!",
      successCta: "View module",
      successRoute: "/",
    }),
    motion: ["fade-rise", "soft-expand"],
  },
  review: {
    layout: "notes-clean",
    hero: "notebook",
    showConfidence: true,
    sections: KNOWLEDGE_SECTIONS,
    fieldGroups: [
      { id: "header", label: "Basics", order: 0 },
      { id: "main", label: "Content", order: 1 },
      { id: "body", label: "Notes", order: 2 },
    ],
  },
  surfaces: {
    headerStyle: "minimal",
    navStyle: "airy",
    dashboardWidgets: [],
  },
}
