'use client'

import { filterArray } from '@syncedstore/core'
import { useSyncedStore } from '@syncedstore/react'
import { useMutation, useQuery } from '@tanstack/react-query'

import type { Branch, Commit } from '../lib/gitStore'
import { cloneBlocks, localBranchSnapshots, store } from '../lib/store'

export function useGitSync() {
  const state = useSyncedStore(store)

  const { data: commitData } = useQuery({
    queryKey: ['commits'],
    queryFn: async () => {
      const res = await fetch('/api/git/commits')
      return res.json()
    },
  })

  const { data: branchData } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await fetch('/api/git/branches')
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
      const newCommit = data.commit as Commit

      // FIXME: check the order of commits so we don't have to unshift
      state.commits.push(newCommit)
      state.head.id = newCommit.id

      // Clear the staging list
      filterArray(state.blocks, () => false)

      if (state.currentBranch?.id) {
        localBranchSnapshots[state.currentBranch.id] = {
          commits: [...state.commits],
          head: { ...state.head },
          blocks: JSON.parse(JSON.stringify(state.blocks)),
        }
      }
    },
  })

  const checkoutCommitMutation = useMutation({
    mutationFn: async (commitId: string) => {
      const res = await fetch(`/api/git/commit/${commitId}/checkout`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: (data) => {
      const head = data.head as Commit | undefined

      if (!head) {
        filterArray(state.blocks, () => false)
        state.head.id = null
      } else {
        state.blocks.splice(0, state.blocks.length, ...head.tree)
        state.head.id = head.id
      }

      state.head.detached = true
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
      const commits = data.commits as Commit[]
      const head = data.head as Commit | undefined

      if (!head) {
        filterArray(state.blocks, () => false)
        state.head.id = null
      } else {
        state.blocks.splice(0, state.blocks.length, ...head.tree)
        state.head.id = head.id
      }

      state.commits.splice(0, state.commits.length, ...commits)
    },
  })

  const createBranchMutation = useMutation({
    mutationFn: async (name: string) => {
      const fromCommitId = state.head?.id
      const res = await fetch('/api/git/branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, fromCommitId }),
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: (data) => {
      const branches = data.branches as Branch[]
      const current = data.currentBranch as Branch | undefined

      const newBranchMap = Object.fromEntries(branches.map((b) => [b.id, b]))

      Object.keys(state.branches).forEach((key) => {
        if (!newBranchMap[key]) delete state.branches[key]
      })
      Object.entries(newBranchMap).forEach(([id, branch]) => {
        state.branches[id] = branch
      })

      state.currentBranch.id = current?.id
    },
  })

  const deleteBranchMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/git/branch/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: (data) => {
      const branches = data.branches as Branch[]
      const current = data.currentBranch as Branch | undefined

      const newBranchMap = Object.fromEntries(branches.map((b) => [b.id, b]))

      Object.keys(state.branches).forEach((key) => {
        if (!newBranchMap[key]) delete state.branches[key]
      })
      Object.entries(newBranchMap).forEach(([id, branch]) => {
        state.branches[id] = branch
      })

      state.currentBranch.id = current?.id
    },
  })

  const checkoutBranchMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`/api/git/branch/${name}/checkout`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: (data) => {
      const commits = data.commits as Commit[]
      const current = data.currentBranch as Branch | undefined
      const head = data.head as Commit | undefined

      if (state.currentBranch?.id) {
        localBranchSnapshots[state.currentBranch.id] = {
          commits: [...state.commits],
          head: { ...state.head },
          blocks: JSON.parse(JSON.stringify(state.blocks)),
        }
      }

      state.currentBranch.id = current?.id
      state.head.detached = false

      const snap = localBranchSnapshots[state.currentBranch.id]
      if (snap) {
        state.commits.splice(0, state.commits.length, ...commits)
        state.head.id = snap.head.id ?? null
        state.blocks.splice(0, state.blocks.length, ...snap.blocks)
      } else {
        state.commits.splice(0, state.commits.length, ...commits)

        if (head) {
          state.blocks.splice(0, state.blocks.length, ...head.tree)
          state.head.id = head.id
        } else {
          filterArray(state.blocks, () => false)
          state.head.id = null
        }
      }
    },
    onError: (error) => {
      console.error('Checkout failed:', error)
    },
  })

  return {
    commitData,
    branchData,

    commitMutation,
    checkoutCommitMutation,
    deleteCommitMutation,
    createBranchMutation,
    deleteBranchMutation,
    checkoutBranchMutation,
  }
}
