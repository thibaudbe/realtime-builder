'use client'

import { useEffect, useState } from 'react'

import { useSyncedStore } from '@syncedstore/react'
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { TaskBlock } from './components/task-block'
import { cloneBlocks, createTodo, store } from './lib/store'

function Editor() {
  const [inputValue, setInputValue] = useState('')

  const state = useSyncedStore(store)

  const headId = state.head.id ?? null

  const queryClient = useQueryClient()

  const { data: commitData } = useQuery({
    queryKey: ['commits'],
    queryFn: async () => {
      const res = await fetch('/api/git/commits')
      return res.json()
    },
  })

  const commitMutation = useMutation({
    mutationFn: async (message: string) => {
      const blocks = cloneBlocks(state.blocks)
      const res = await fetch('/api/git/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, blocks }),
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: (data) => {
      const newCommit = data?.commit
      if (newCommit) {
        state.commits.push(newCommit)
        state.head.id = newCommit.id
      }
      queryClient.invalidateQueries({ queryKey: ['commits'] })
    },
  })

  const rollbackMutation = useMutation({
    mutationFn: async (commitId: string) => {
      const res = await fetch(`/api/git/commit/${commitId}/rollback`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: (data) => {
      if (data?.head) {
        state.blocks.splice(0, state.blocks.length, ...(data.head.tree || []))
        state.head.id = data.head.id
      }
      queryClient.invalidateQueries({ queryKey: ['commits'] })
    },
  })

  const deleteCommitMutation = useMutation({
    mutationFn: async (commitId: string) => {
      const res = await fetch(`/api/git/commit/${commitId}`, {
        method: 'DELETE',
      })
      return res.json()
    },
    onSuccess: (data) => {
      state.commits.splice(0, state.commits.length, ...data.commits)
      state.head.id = data.head?.id || null

      if (data.head) {
        state.blocks.splice(0, state.blocks.length, ...(data.head.tree || []))
      } else {
        state.blocks.splice(0, state.blocks.length)
      }

      queryClient.invalidateQueries({ queryKey: ['commits'] })
    },
  })

  useEffect(() => {
    if (commitData?.commits.length === 0) {
      state.commits.splice(0, state.commits.length)
      state.head.id = null
    }

    if (commitData?.commits?.length > 0 && state.commits.length === 0) {
      state.commits.push(...commitData.commits)
      state.head.id = commitData.commits[commitData.commits.length - 1].id
    }
  }, [commitData, state])

  const addRootBlock = () => {
    const title = inputValue.trim()
    if (title) {
      state.blocks.push(createTodo(title))
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

      {/* {headId ? <p>Current commit: {headId.slice(0, 7)}</p> : <p>No commit</p>} */}

      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="New task..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addRootBlock()
          }}
          style={{ width: '60%', marginRight: 8 }}
        />
        <button onClick={addRootBlock}>Add</button>
        <button onClick={handleCommit} style={{ marginLeft: 16 }}>
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

      <h2 style={{ marginTop: 24 }}>Commit History</h2>

      <ul>
        {state.commits.length === 0 ? (
          <li style={{ marginBottom: 8 }}>No commits</li>
        ) : (
          state.commits.map((commit) => (
            <li
              key={commit.id}
              style={{
                marginBottom: 8,
                fontWeight: commit.id === headId ? 'bold' : 'normal',
              }}
            >
              <code>{commit.id.slice(0, 7)}</code> – {commit.message}{' '}
              <small>({new Date(commit.timestamp).toLocaleString()})</small>
              <button
                style={{
                  marginLeft: 8,
                }}
                disabled={commit.id === headId || rollbackMutation.isPending}
                onClick={() => rollbackMutation.mutate(commit.id)}
              >
                {rollbackMutation.isPending ? 'Rolling back...' : 'Rollback'}
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
