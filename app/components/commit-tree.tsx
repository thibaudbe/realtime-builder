'use client'

import { useSyncedStore } from '@syncedstore/react'

import { store } from '../lib/store'
import { CommitTreeItem } from './commit-tree-item'

export function CommitTree() {
  const state = useSyncedStore(store)

  return (
    <div>
      <h2>Commit History</h2>

      {state.commits.length === 0 ? (
        <p>No commits</p>
      ) : (
        <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
          {state.commits.map((commit) => (
            <CommitTreeItem key={commit.id} commit={commit} />
          ))}
        </ul>
      )}
    </div>
  )
}
