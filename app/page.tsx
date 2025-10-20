'use client'

import { useEffect, useState } from 'react'

import { filterArray } from '@syncedstore/core'
import { useSyncedStore } from '@syncedstore/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { TaskBlock } from './components/task-block'
import { useGitSync } from './hooks/use-git-sync'
import { Branch } from './lib/gitStore'
import { createBlock, store } from './lib/store'

function sliceId(id: string) {
  return id.slice(0, 7)
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString()
}

function Editor() {
  const [inputValue, setInputValue] = useState('')

  const state = useSyncedStore(store)

  const {
    commitData,
    branchData,
    commitMutation,
    checkoutCommitMutation,
    deleteCommitMutation,
    createBranchMutation,
    deleteBranchMutation,
    checkoutBranchMutation,
  } = useGitSync()

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

  if (!commitData) {
    return <p>Loading...</p>
  }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Collaborative Versioned Todo List (Git-like)</h1>

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

      {/* Branches */}
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

      <div>
        <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
          {Object.keys(state.branches).length === 0 ? (
            <li style={{ marginBottom: 4 }}>
              <span>No branches</span>
            </li>
          ) : (
            Object.values<Branch>(state.branches as Branch[]).map((branch) => (
              <li key={branch.id} style={{ marginBottom: 4 }}>
                <span
                  style={{
                    width: '300px',
                    display: 'inline-block',
                    fontWeight:
                      branch.id === state.currentBranch.id ? 'bold' : 'normal',
                  }}
                >
                  <code>{sliceId(branch.id)}</code> – {branch.name}
                </span>

                {(branch.id !== state.currentBranch.id ||
                  state.head.detached) && (
                  <>
                    <button
                      style={{ marginLeft: 8 }}
                      disabled={
                        checkoutBranchMutation.isPending ||
                        deleteBranchMutation.isPending
                      }
                      onClick={() => checkoutBranchMutation.mutate(branch.id)}
                    >
                      {state.head.detached ? 'Re-attach' : 'Checkout'}
                    </button>
                    <button
                      style={{ marginLeft: 4 }}
                      disabled={
                        checkoutBranchMutation.isPending ||
                        deleteBranchMutation.isPending
                      }
                      onClick={() => deleteBranchMutation.mutate(branch.id)}
                    >
                      Delete
                    </button>
                  </>
                )}

                {branch.id === state.currentBranch.id &&
                  !state.head.detached && (
                    <span style={{ marginLeft: 8 }}>(current)</span>
                  )}
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Blocks */}
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
          <TaskBlock
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

      {/* Commit History */}
      <h2>Commit History</h2>
      <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
        {state.commits.length === 0 ? (
          <li style={{ marginBottom: 8 }}>No commits</li>
        ) : (
          state.commits.map((commit) => (
            <li
              key={commit.id}
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
                {checkoutCommitMutation.isPending
                  ? 'Checking out...'
                  : 'Checkout'}
              </button>
              <button
                disabled={deleteCommitMutation.isPending}
                onClick={() => deleteCommitMutation.mutate(commit.id)}
              >
                {deleteCommitMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </li>
          ))
        )}
      </ul>
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
