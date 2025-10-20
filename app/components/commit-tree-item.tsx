'use client'

import { useSyncedStore } from '@syncedstore/react'

import { useGitSync } from '../hooks/use-git-sync'
import { store } from '../lib/store'
import { formatDate, sliceId } from '../utils'
import { type Commit } from '../lib/gitStore'

export function CommitTreeItem({ commit }: { commit: Commit }) {
  const state = useSyncedStore(store)

  const { checkoutCommitMutation, deleteCommitMutation } = useGitSync()

  return (
    <li
      style={{
        marginBottom: 8,
        fontWeight: commit.id === state.head.id ? 'bold' : 'normal',
      }}
    >
      {commit.id === state.head.id && <span>[HEAD] </span>}
      <code>{sliceId(commit.id)}</code> – {commit.message}{' '}
      <small>({formatDate(commit.timestamp)})</small>
      <button
        style={{
          marginLeft: 8,
        }}
        disabled={
          (commit.id === state.head.id && state.head.detached) ||
          checkoutCommitMutation.isPending
        }
        onClick={() => checkoutCommitMutation.mutate(commit.id)}
      >
        {checkoutCommitMutation.isPending ? 'Checking out...' : 'Checkout'}
      </button>
      <button
        disabled={deleteCommitMutation.isPending}
        onClick={() => deleteCommitMutation.mutate(commit.id)}
      >
        {deleteCommitMutation.isPending ? 'Deleting...' : 'Delete'}
      </button>
    </li>
  )
}
