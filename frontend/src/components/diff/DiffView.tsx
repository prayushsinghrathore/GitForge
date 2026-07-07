import { FileText, Plus, Minus } from 'lucide-react'
import type { DiffFileDTO, DiffLineDTO } from '@/lib/api/types'
import { cn } from '@/lib/utils'

/**
 * Unified diff renderer. Takes the backend's line-level {@link DiffFileDTO}
 * (already computed by the engine's LCS diff) and paints it as a GitHub-style
 * split-gutter view: old line number · new line number · sign · text.
 *
 * Rendering is intentionally dumb — no diff logic lives here, the engine owns
 * that. This keeps the component a pure function of its props and trivially
 * testable.
 */
export function DiffView({ files }: { files: DiffFileDTO[] }) {
  if (files.length === 0) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed border-border/60 p-8 text-center text-xs text-muted-foreground">
        No file changes in this commit.
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {files.map((file) => (
        <DiffFile key={file.path} file={file} />
      ))}
    </div>
  )
}

function DiffFile({ file }: { file: DiffFileDTO }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40">
      <header className="flex items-center gap-2 border-b border-border/60 bg-secondary/40 px-3 py-2">
        <FileText className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate font-mono text-xs text-foreground">{file.path}</span>
        <span className="ml-auto flex items-center gap-2 font-mono text-[11px]">
          <span className="flex items-center gap-0.5 text-forge-emerald">
            <Plus className="size-3" />
            {file.insertions}
          </span>
          <span className="flex items-center gap-0.5 text-destructive">
            <Minus className="size-3" />
            {file.deletions}
          </span>
        </span>
      </header>
      <div className="overflow-x-auto scroll-slim">
        <table className="w-full border-collapse font-mono text-[12px] leading-[1.5]">
          <tbody>
            {file.lines.map((line, i) => (
              <DiffRow key={i} line={line} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const OP_STYLES: Record<DiffLineDTO['op'], { row: string; sign: string; text: string }> = {
  add: { row: 'bg-forge-emerald/10', sign: 'text-forge-emerald', text: '+' },
  remove: { row: 'bg-destructive/10', sign: 'text-destructive', text: '-' },
  equal: { row: '', sign: 'text-muted-foreground/40', text: ' ' },
}

function DiffRow({ line }: { line: DiffLineDTO }) {
  const style = OP_STYLES[line.op]
  return (
    <tr className={cn('align-top', style.row)}>
      <td className="w-10 select-none border-r border-border/40 px-2 text-right text-[11px] tabular-nums text-muted-foreground/50">
        {line.old_lineno ?? ''}
      </td>
      <td className="w-10 select-none border-r border-border/40 px-2 text-right text-[11px] tabular-nums text-muted-foreground/50">
        {line.new_lineno ?? ''}
      </td>
      <td className={cn('w-5 select-none pl-2 text-center', style.sign)}>{style.text}</td>
      <td className="whitespace-pre px-2 pr-4 text-foreground/90">{line.text || ' '}</td>
    </tr>
  )
}
