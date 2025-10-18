import { v4 as uuid } from 'uuid'

import type { Block } from './store'

export interface Commit {
  id: string
  message: string
  timestamp: number
  tree: Block[]
  parentId?: string
}

class GitStore {
  private commits: Commit[] = []
  private staging: Block[] = []
  private head: Commit | undefined

  add = (blocks: Block[]): void => {
    this.staging = JSON.parse(JSON.stringify(blocks))
  }

  commit = (message: string): Commit => {
    if (!this.staging || this.staging.length === 0) {
      throw new Error('Nothing staged to commit')
    }
    const commit: Commit = {
      id: uuid(),
      message,
      timestamp: Date.now(),
      tree: JSON.parse(JSON.stringify(this.staging)),
      parentId: this.head?.id,
    }
    this.commits.push(commit)
    this.head = commit
    this.staging = []
    return commit
  }

  push = (): Commit | undefined => {
    return this.head
  }

  delete = (id: string): Commit[] => {
    const index = this.commits.findIndex((c) => c.id === id)
    if (index === -1) return this.list()

    const isHead = this.head?.id === id
    const previousCommit = index > 0 ? this.commits[index - 1] : null

    this.commits.splice(index, 1)

    if (isHead) {
      this.head = previousCommit || null
      return this.commits
    }

    return this.list()
  }

  rollback = (id: string): Commit | undefined => {
    const target = this.commits.find((c) => c.id === id)
    if (target) {
      this.head = target
    }
    return this.head
  }

  list = (): Commit[] => {
    return [...this.commits]
  }

  getHead = (): Commit | undefined => {
    return this.head
  }
}

declare global {
  // Extend the global interface to type gitStore on globalThis
  var gitStore: GitStore | undefined
}

// To keep the state in memory between multiple server requests, we store the instance in the global object globalThis.
// This ensures that Next.js reuses the same GitStore instance as long as the Node process is not restarted.
if (!globalThis.gitStore) {
  globalThis.gitStore = new GitStore()
}

export const gitStore = globalThis.gitStore
