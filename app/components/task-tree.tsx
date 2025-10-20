import { useState } from 'react'

import { filterArray } from '@syncedstore/core'
import { useSyncedStore } from '@syncedstore/react'

import { useGitSync } from '../hooks/use-git-sync'
import { createBlock, store } from '../lib/store'
import { TaskTreeItem } from './task-tree-item'

export function TaskTree() {
  const [inputValue, setInputValue] = useState('')

  const state = useSyncedStore(store)

  const { commitMutation } = useGitSync()

  const addRootBlock = () => {
    const title = inputValue.trim()
    if (title) {
      state.blocks.push(createBlock(title))
      setInputValue('')
    }
  }

  const handleCommit = () => {
    const message = prompt('Commit message?')
    if (!message) return
    commitMutation.mutate(message)
  }

  return (
    <div>
      <h2>Tasks (staged)</h2>

      {/* Commit Actions */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="New task..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addRootBlock()
          }}
          style={{ width: '60%', marginRight: 4 }}
        />

        <button onClick={addRootBlock}>Add</button>

        <button
          onClick={handleCommit}
          disabled={state.head.detached || state.blocks.length === 0}
          title={
            state.head.detached ? 'Cannot commit in detached HEAD' : undefined
          }
          style={{ marginLeft: 8 }}
        >
          Commit
        </button>
      </div>

      {state.blocks.length === 0 ? (
        <p>No tasks</p>
      ) : (
        state.blocks.map((block, idx) => (
          <TaskTreeItem
            key={block.id}
            block={block}
            onDelete={() => state.blocks.splice(idx, 1)}
          />
        ))
      )}

      {state.blocks.length > 0 && (
        <button
          style={{ marginTop: 10 }}
          onClick={() => {
            filterArray(state.blocks, () => false)
          }}
        >
          Clear list
        </button>
      )}
    </div>
  )
}
