import { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, CheckCircle2, AlertTriangle, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { GithubIcon } from '@/lib/github-icon'
import { useImportRepo } from '@/lib/hooks/mutations'
import { useRepoStore } from '@/store/useRepoStore'
import { ApiError } from '@/lib/api/client'

/**
 * Dialog for importing a GitHub repository. Accepts a URL, validates its format
 * via the backend, clones the repo, and switches the UI to the imported repo.
 */
export function ImportRepoDialog() {
  const open = useRepoStore((s) => s.importDialogOpen)
  const setOpen = useRepoStore((s) => s.setImportDialogOpen)
  const setRepo = useRepoStore((s) => s.setRepo)
  const pushActivity = useRepoStore((s) => s.pushActivity)

  const [url, setUrl] = useState('')
  const importMutation = useImportRepo()
  const [error, setError] = useState<string | null>(null)
  const [importedName, setImportedName] = useState<string | null>(null)

  const handleImport = () => {
    setError(null)
    setImportedName(null)
    importMutation.mutate(
      { repo_url: url.trim() },
      {
        onSuccess: (result) => {
          setImportedName(result.name)
          setRepo(result.name)
          pushActivity(`✓ imported ${result.name} (${result.commit_count} commits)`)
        },
        onError: (e) => {
          if (e instanceof ApiError) {
            setError(e.detail ?? e.message)
          } else if (e instanceof Error) {
            setError(e.message)
          } else {
            setError('Import failed. Check the URL and try again.')
          }
        },
      },
    )
  }

  const handleClose = () => {
    setOpen(false)
    setUrl('')
    setError(null)
    setImportedName(null)
    importMutation.reset()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="p-0">
        <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-primary/10">
              <GithubIcon className="size-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-sm">Import Repository</DialogTitle>
              <DialogDescription className="mt-0.5 text-xs">
                Clone a public GitHub repository
              </DialogDescription>
            </div>
          </div>
          <DialogClose asChild>
            <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
              <X className="size-4" />
            </Button>
          </DialogClose>
        </div>

        {importedName ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-3 px-6 py-8 text-center"
          >
            <CheckCircle2 className="size-10 text-forge-emerald" />
            <p className="text-sm font-semibold text-foreground">
              Imported {importedName}
            </p>
            <p className="text-xs text-muted-foreground">
              {importMutation.data?.commit_count ?? 0} commits imported.
            </p>
            <Button size="sm" onClick={handleClose} className="mt-2">
              Done
            </Button>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-4 px-6 pb-6 pt-4">
            <input
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !importMutation.isPending && handleImport()}
              placeholder="https://github.com/owner/repo"
              className="h-10 w-full rounded-lg bg-secondary px-3 font-mono text-sm outline-none ring-1 ring-border/60 transition-colors focus-visible:ring-2 focus-visible:ring-primary/60"
            />

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive"
              >
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Supports HTTPS and SSH URLs
              </span>
              <Button
                size="sm"
                onClick={handleImport}
                disabled={importMutation.isPending || !url.trim()}
                className="gap-2"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Cloning…
                  </>
                ) : (
                  <>
                    <GithubIcon className="size-3.5" />
                    Import
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
