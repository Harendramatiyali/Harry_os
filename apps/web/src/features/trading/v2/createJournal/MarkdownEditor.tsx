import { AITextarea, type AITextareaProps } from "@/shared/components/AITextarea"

type Props = {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number
  /** Defaults to a generic notes field when omitted. */
  fieldId?: string
  fieldName?: string
  fieldDescription?: string
  writingStyle?: string
  aiInstruction?: string
  enableAI?: boolean
  showFieldTitle?: boolean
  className?: string
}

/**
 * Journal markdown editor — Writing Copilot enabled by default via {@link AITextarea}.
 * Pass field context so rewrites stay purpose-aware per textarea.
 */
export function MarkdownEditor({
  id,
  value,
  onChange,
  placeholder = "Write raw thoughts — Hindi, Hinglish, or short notes are fine…",
  minHeight = 140,
  fieldId = "notes",
  fieldName = "Notes",
  fieldDescription = "Transform the trader's raw notes into polished journal English. Preserve every fact; invent nothing.",
  writingStyle = "Professional trading journal — natural, human, fluent English",
  aiInstruction = "Convert fragmented / Hindi / Hinglish notes into well-written journal prose without adding analysis.",
  enableAI = true,
  showFieldTitle = false,
  className,
}: Props) {
  const aiProps: AITextareaProps = {
    id,
    fieldId,
    fieldName,
    fieldDescription,
    writingStyle,
    aiInstruction,
    enableAI,
    value,
    onChange,
    placeholder,
    minHeight,
    mode: "markdown",
    showFieldTitle,
    className,
    debounceMs: 800,
  }
  return <AITextarea {...aiProps} />
}
