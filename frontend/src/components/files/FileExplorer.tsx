import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { File, History, FileCode2, AlertTriangle } from 'lucide-react'
import { useGraph, useSnapshot, useFileHistory } from '@/lib/hooks/queries'
import { Skeleton } from '@/components/ui/skeleton'
import { AuthorAvatar } from '@/components/common/AuthorAvatar'
import { useRepoStore } from '@/store/useRepoStore'
import { relativeTime, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { DiffFileDTO } from '@/lib/api/types'

/**
 * Repository explorer. Uses the HEAD snapshot (a diff from the empty tree, so
 * every line is an "add" carrying the file's current content) to list files and
 * show their contents, and the file-history endpoint to show each file's
 * commit trail.
 */
export function FileExplorer() {
  const { data: graph } = useGraph()
  const head = graph?.head ?? null
  const { data: snapshot, isLoading, isError } = useSnapshot(head)
  const [activePath, setActivePath] = useState<string | null>(null)

  const files = useMemo(
    () => (snapshot ? [...snapshot].sort((a, b) => a.path.localeCompare(b.path)) : []),
    [snapshot],
  )

  const selected = activePath ?? files[0]?.path ?? null
  const selectedFile = files.find((f) => f.path === selected) ?? null

  if (isError) {
    return (
      <div className="grid h-full place-items-center bg-forge-radial p-8">
        <div className="glass flex max-w-md items-center gap-3 rounded-xl p-4 text-sm text-forge-amber">
          <AlertTriangle className="size-5 shrink-0" />
          <span>Couldn't load the file tree.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full bg-forge-radial">
      {/* File list */}
      <div className="flex w-72 shrink-0 flex-col border-r border-border/50">
        <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
          <FileCode2 className="size-4 text-primary" />
          <span className="text-sm font-semibold">Files</span>
          <span className="ml-auto text-[11px] text-muted-foreground">{files.length}</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto scroll-slim p-2">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="mb-1 h-8 w-full rounded-md" />
            ))
          ) : files.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground">No files at HEAD.</p>
          ) : (
            files.map((f) => (
              <button
                key={f.path}
                onClick={() => setActivePath(f.path)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                  f.path === selected
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
              >
                <File className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate font-mono">{f.path}</span>
                <span className="ml-auto shrink-0 text-[10px] text-muted-foreground/60">
                  {f.lines.length}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* File content + history */}
      <div className="flex min-w-0 flex-1 flex-col">
        {selectedFile ? (
          <FileDetail file={selectedFile} />
        ) : (
          <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
            {isLoading ? 'Loading…' : 'Select a file to view its contents.'}
          </div>
        )}
      </div>
    </div>
  )
}

function FileDetail({ file }: { file: DiffFileDTO }) {
  return (
    <>
      <div className="flex items-center gap-2 border-b border-border/50 px-5 py-3">
        <File className="size-4 text-muted-foreground" />
        <span className="font-mono text-sm text-foreground">{file.path}</span>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {file.lines.length} lines
        </span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_280px]">
        {/* Content */}
        <div className="min-h-0 overflow-auto scroll-slim p-5">
          <pre className="font-mono text-[12px] leading-[1.6]">
            <code>
              {file.lines.map((line, i) => (
                <div key={i} className="flex gap-4">
                  <span className="w-8 shrink-0 select-none text-right text-muted-foreground/40 tabular-nums">
                    {i + 1}
                  </span>
                  <span className="whitespace-pre text-foreground/90">{line.text || ' '}</span>
                </div>
              ))}
            </code>
          </pre>
        </div>
        {/* History */}
        <div className="min-h-0 overflow-y-auto scroll-slim border-l border-border/50 p-4">
          <FileHistoryList path={file.path} />
        </div>
      </div>
    </>
  )
}

function FileHistoryList({ path }: { path: string }) {
  const { data, isLoading } = useFileHistory(path)
  const selectCommit = useRepoStore((s) => s.selectCommit)
  const setPanel = useRepoStore((s) => s.setPanel)

  return (
    <div>
      <p className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        <History className="size-3" />
        History
      </p>
      {isLoading || !data ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : data.commits.length === 0 ? (
        <p className="text-xs text-muted-foreground">No history for this file.</p>
      ) : (
        <ol className="flex flex-col gap-1">
          {data.commits.map((c, i) => (
            <motion.li
              key={c.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <button
                onClick={() => {
                  setPanel('graph')
                  selectCommit(c.id)
                }}
                className="flex w-full items-start gap-2 rounded-lg p-2 text-left hover:bg-accent/50"
              >
                <AuthorAvatar name={c.author} size={20} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-foreground">{c.message}</p>
                  <p
                    className="mt-0.5 text-[10px] text-muted-foreground"
                    title={formatDateTime(c.timestamp)}
                  >
                    <span className="font-mono">{c.short}</span> · {relativeTime(c.timestamp)}
                  </p>
                </div>
              </button>
            </motion.li>
          ))}
        </ol>
      )}
    </div>
  )
}
