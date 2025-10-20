'use client'

import { useEffect, useState } from 'react'

import { useSyncedStore } from '@syncedstore/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { BranchTree } from './components/branch-tree'
import { CommitTree } from './components/commit-tree'
import { TaskTree } from './components/task-tree'
import { useGitSync } from './hooks/use-git-sync'
import { store } from './lib/store'

function Editor() {
  const state = useSyncedStore(store)

  const { commitData, branchData } = useGitSync()

  useEffect(() => {
    if (!commitData) return

    state.commits.splice(0, state.commits.length, ...commitData.commits)

    if (commitData.commits?.length > 0) {
      state.head.id = commitData.commits[commitData.commits.length - 1].id
    } else {
      state.head.id = null
    }
  }, [commitData, state])

  useEffect(() => {
    if (!branchData) return

    const { branches = {}, currentBranch } = branchData

    Object.keys(state.branches).forEach((key) => {
      if (!(key in branches)) {
        delete state.branches[key]
      }
    })

    Object.entries(branches).forEach(([id, branch]) => {
      if (!state.branches[id]) {
        state.branches[id] = branch
      } else {
        Object.assign(state.branches[id], branch)
      }
    })

    if (currentBranch?.id) {
      state.currentBranch.id = currentBranch.id
    }
  }, [branchData, state])

  if (!commitData) {
    return <p>Loading...</p>
  }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Todo List - Versioned & Collaborative</h1>

      {/* Online/offline toggle */}
      {/* <div style={{ marginBottom: 16 }}>
        <span style={{ marginRight: 8 }}>Status:</span>
        <label style={{ marginRight: 12 }}>
          <input
            type="radio"
            name="connectivity"
            checked={online === true}
            onChange={() => {
              setOnline(true)
              connect()
            }}
          />
          Online
        </label>
        <label>
          <input
            type="radio"
            name="connectivity"
            checked={online === false}
            onChange={() => {
              setOnline(false)
              disconnect()
            }}
          />
          Offline
        </label>
      </div> */}

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
