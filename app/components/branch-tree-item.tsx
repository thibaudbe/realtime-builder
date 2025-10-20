'use client'

import { useSyncedStore } from '@syncedstore/react'

import { useGitSync } from '../hooks/use-git-sync'
import type { Branch } from '../lib/gitStore'
import { store } from '../lib/store'
import { sliceId } from '../utils'

export function BranchTreeItem({ branch }: { branch: Branch }) {
  const state = useSyncedStore(store)

  const { deleteBranchMutation, checkoutBranchMutation } = useGitSync()

  return (
    <li key={branch.id} style={{ marginBottom: 4 }}>
      <span
        style={{
          width: '300px',
          display: 'inline-block',
          fontWeight: branch.id === state.currentBranch.id ? 'bold' : 'normal',
        }}
      >
        <code>{sliceId(branch.id)}</code> – {branch.name}
      </span>

      {(branch.id !== state.currentBranch.id || state.head.detached) && (
        <>
          <button
            style={{ marginLeft: 8 }}
            disabled={
              checkoutBranchMutation.isPending || deleteBranchMutation.isPending
            }
            onClick={() => checkoutBranchMutation.mutate(branch.id)}
          >
            {state.head.detached ? 'Re-attach' : 'Checkout'}
          </button>
          <button
            style={{ marginLeft: 4 }}
            disabled={
              checkoutBranchMutation.isPending || deleteBranchMutation.isPending
            }
            onClick={() => deleteBranchMutation.mutate(branch.id)}
          >
            Delete
          </button>
        </>
      )}

      {branch.id === state.currentBranch.id && !state.head.detached && (
        <span style={{ marginLeft: 8 }}>(current)</span>
      )}
    </li>
  )
}
