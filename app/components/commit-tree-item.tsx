'use client'

import { useSyncedStore } from '@syncedstore/react'

import { git } from '../lib/git-synced-store'
import { store } from '../lib/store'
import { formatDate, sliceId } from '../utils'
import { type Commit } from '../lib/gitStore'

export function CommitTreeItem({ commit }: { commit: Commit }) {
  const state = useSyncedStore(store)

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
        disabled={commit.id === state.head.id && state.head.detached}
        onClick={() => git.checkoutCommit(commit.id)}
      >
        Checkout
      </button>
      <button onClick={() => git.deleteCommit(commit.id)}>Delete</button>
    </li>
  )
}
