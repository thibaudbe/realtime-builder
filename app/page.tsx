'use client'

import { useEffect, useState } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { BranchTree } from './components/branch-tree'
import { CommitTree } from './components/commit-tree'
import { ConnectionStatus } from './components/connection-status'
import { TaskTree } from './components/task-tree'

function Editor() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Prevents hydration mismatch
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div>Loading...</div>
  }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <ConnectionStatus />
      <BranchTree />
      <TaskTree />
      <CommitTree />
    </div>
  )
}

export default function Page() {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={queryClient}>
      <Editor />
    </QueryClientProvider>
  )
}
