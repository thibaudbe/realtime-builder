'use client'

import { useSyncedStore } from '@syncedstore/react'

import { useGitSync } from '../hooks/use-git-sync'
import { type Branch } from '../lib/gitStore'
import { store } from '../lib/store'
import { BranchTreeItem } from './branch-tree-item'

export function BranchTree() {
  const state = useSyncedStore(store)

  const { createBranchMutation } = useGitSync()

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <h2>Branches</h2>
        <button
          onClick={() => {
            const name = prompt('Branch name?')
            if (!name) return
            createBranchMutation.mutate(name)
          }}
        >
          Create branch
        </button>
      </div>

      {state.head.detached && (
        <p style={{ backgroundColor: 'orange', padding: 8 }}>
          Detached HEAD from Branch
        </p>
      )}

      {Object.keys(state.branches).length === 0 && <p>No branches</p>}

      {Object.keys(state.branches).length === 0 && (
        <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
          {Object.values<Branch>(state.branches as Branch[]).map((branch) => (
            <BranchTreeItem key={branch.id} branch={branch} />
          ))}
        </ul>
      )}
    </div>
  )
}
