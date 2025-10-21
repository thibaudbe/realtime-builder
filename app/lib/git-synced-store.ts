import { v4 as uuid } from 'uuid'

import { filterArray } from '@syncedstore/core'

import type { Branch, Commit } from './git-store'
import { type Store, type Block, store } from './store'

export class GitSyncedStore {
  private state: Store

  constructor(state: Store) {
    this.state = state
  }

  /** ------------------- Commits ------------------- */

  /**
   * `git add`
   *
   * Stages changes for the next commit
   */
  add = (blocks: Block[]): void => {
    if (!blocks || blocks.length === 0) {
      filterArray(this.state.blocks, () => false)
      return
    }
    this.state.blocks.splice(0, this.state.blocks.length, ...blocks)
  }

  /**
   * `git commit -m <message>`
   *
   * Records changes to the repository
   */
  commit = (message: string): Commit => {
    if (!this.state.blocks.length) {
      throw new Error('Nothing staged to commit')
    }

    const branchId = this.state.currentBranch.id
    const branch = this.state.branches[branchId]
    if (!branch) {
      throw new Error(`Branch "${branchId}" not found`)
    }

    const newCommit: Commit = {
      id: uuid(),
      message,
      timestamp: Date.now(),
      tree: JSON.parse(JSON.stringify(this.state.blocks)),
      parentId: branch.headId,
      branchId,
    }

    this.state.commits.push(newCommit)
    branch.headId = newCommit.id
    this.state.head.id = newCommit.id
    this.state.head.detached = false

    filterArray(this.state.blocks, () => false)

    return newCommit
  }

  /**
   * `git reset --hard <commit>`
   *
   * Moves HEAD to a commit and removes all commits following it in the current branch.
   * ⚠️ Destructive: rewrites the history of the current branch.
   */
  resetToCommit = (id: string): Commit | undefined => {
    const commit = this.state.commits.find((c) => c.id === id)
    if (!commit) {
      throw new Error(`Commit "${id}" not found`)
    }

    const branch = this.state.branches[this.state.currentBranch.id]
    if (!branch) {
      throw new Error(`Branch not found`)
    }

    const index = this.state.commits.findIndex((c) => c.id === id)
    if (index === -1) {
      throw new Error('Commit not found in history')
    }
    this.state.commits.splice(index + 1)

    branch.headId = commit.id
    this.state.head.id = commit.id

    return commit
  }

  /**
   * `git revert <commit>`
   *
   * Creates a new commit that undoes the changes of the specified commit.
   * Does not modify the previous history.
   */
  revertCommit = (id: string, message?: string): Commit => {
    const target = this.state.commits.find((c) => c.id === id)
    if (!target) {
      throw new Error(`Commit "${id}" not found`)
    }

    const branch = this.state.branches[this.state.currentBranch.id]
    if (!branch) {
      throw new Error(`Branch not found`)
    }

    const newCommit: Commit = {
      id: uuid(),
      message: message || `revert: ${target.message}`,
      timestamp: Date.now(),
      tree: JSON.parse(JSON.stringify(target.tree)),
      parentId: branch.headId,
      branchId: this.state.currentBranch.id,
    }

    this.state.commits.push(newCommit)
    branch.headId = newCommit.id
    this.state.head.id = newCommit.id

    return newCommit
  }

  /**
   * `git checkout <commit>`
   *
   * Moves HEAD to a commit without changing the current branch.
   * Does not modify the branch structure.
   */
  checkoutCommit = (id: string): Commit => {
    const commit = this.state.commits.find((c) => c.id === id)
    if (!commit) {
      throw new Error(`Commit "${id}" not found`)
    }

    // this.state.blocks.splice(0, this.state.blocks.length, ...commit.tree)
    this.state.head.id = commit.id
    this.state.head.detached = true

    return commit
  }

  /**
   * Deletes a specific commit
   * Similar to `git reset --hard HEAD~1` for the last commit
   * or interactive rebase for a specific commit
   */
  deleteCommit = (id: string): void => {
    const index = this.state.commits.findIndex((c) => c.id === id)
    if (index === -1) {
      throw new Error(`Commit "${id}" not found`)
    }

    this.state.commits.splice(index, 1)

    const newHead = this.state.commits[0]
    this.state.head.id = newHead?.id ?? null

    if (newHead) {
      this.state.blocks.splice(0, this.state.blocks.length, ...newHead.tree)
    }
  }

  /**
   * `git log`
   *
   * Shows commit history for current branch from HEAD to the first commit
   */
  listCommits = (): Commit[] => {
    const branchId = this.state.currentBranch.id
    if (!this.state.head.id || !branchId) return []

    const commits: Commit[] = []
    const visited = new Set<string>()
    let currentId = this.state.head.id

    while (currentId && !visited.has(currentId)) {
      const commit = this.state.commits.find((c) => c.id === currentId)
      if (!commit) break

      if (commit.branchId !== branchId) {
        const branch = this.state.branches[branchId]
        const branchHead = branch?.headId
          ? this.state.commits.find((c) => c.id === branch.headId)
          : undefined

        const isAncestor = branchHead
          ? this.isAncestor(commit.id, branchHead.id)
          : false

        if (!isAncestor) break
      }

      visited.add(commit.id)
      commits.push({ ...commit })

      currentId = commit.parentId
    }

    return commits
  }

  /**
   * Checks if a commit belongs to the ancestry of the current branch.
   * i.e. part of the initial branch where this branch was created.
   */
  private isAncestor = (ancestorId: string, descendantId: string): boolean => {
    let currentId: string | undefined = descendantId
    while (currentId) {
      if (currentId === ancestorId) return true
      const commit = this.state.commits.find((c) => c.id === currentId)
      currentId = commit?.parentId
    }
    return false
  }

  /**
   * `git rev-parse HEAD`
   *
   * Returns the current HEAD commit
   */
  getHead = (): Commit | undefined => {
    const id = this.state.head.id
    return id ? this.state.commits.find((c) => c.id === id) : undefined
  }

  /** ------------------- Branches ------------------- */

  /**
   * `git branch -b <branch-name>`
   *
   * Creates a new branch and checks out
   */
  createBranch = (name: string, fromCommitId?: string): Branch => {
    const newBranch: Branch = {
      id: uuid(),
      name,
      headId: fromCommitId || this.state.head.id || undefined,
    }

    // Auto checkout
    this.state.currentBranch.id = newBranch.id

    this.state.branches[newBranch.id] = newBranch
    this.state.head.detached = false

    return newBranch
  }

  /**
   * `git branch -d <branch>`
   *
   * Deletes a branch
   */
  deleteBranch = (branchId: string): void => {
    if (branchId === this.state.currentBranch.id) {
      throw new Error('Cannot delete active branch')
    }
    delete this.state.branches[branchId]
  }

  /**
   * `git checkout <branch>`
   *
   * Switches branches
   */
  checkoutBranch = (branchId: string): void => {
    const branch = this.state.branches[branchId]
    if (!branch) {
      throw new Error(`Branch "${branchId}" not found`)
    }

    this.state.currentBranch.id = branchId
    this.state.head.detached = false

    if (branch.headId) {
      const head = this.state.commits.find((c) => c.id === branch.headId)
      if (head) {
        // filterArray(this.state.blocks, () => false)
        // head.tree.forEach((block) => this.state.blocks.push({ ...block }))
        // this.state.blocks.splice(
        //   0,
        //   this.state.blocks.length,
        //   ...head.tree.map((b) => ({ ...b })),
        // )

        this.state.head.id = head.id
      }
    } else {
      filterArray(this.state.blocks, () => false)
      this.state.head.id = null
    }
  }

  /**
   * `git clone --single-branch --branch <branch>`
   *
   * Creates a new branch from the current branch with the same commit history
   */
  cloneBranch = (name: string, fullHistory = false): Branch => {
    const sourceBranch = this.state.branches[this.state.currentBranch.id]
    if (!sourceBranch) throw new Error('Current branch not found')

    const newBranch: Branch = {
      id: uuid(),
      name,
      headId: sourceBranch.headId,
    }

    if (fullHistory && sourceBranch.headId) {
      const chain: Commit[] = []
      let curId = sourceBranch.headId
      while (curId) {
        const commit = this.state.commits.find((c) => c.id === curId)
        if (!commit) break
        chain.unshift(commit)
        curId = commit.parentId ?? ''
      }

      let prevNewId: string | undefined
      const clonedIds: Record<string, string> = {}

      for (const commit of chain) {
        const newId = uuid()
        const newCommit: Commit = {
          ...commit,
          id: newId,
          parentId: commit.parentId ? clonedIds[commit.parentId] : undefined,
          branchId: newBranch.id,
        }
        this.state.commits.push(newCommit)
        clonedIds[commit.id] = newId
        prevNewId = newId
      }

      newBranch.headId = prevNewId
    }

    this.state.branches[newBranch.id] = newBranch
    return newBranch
  }

  /**
   * `git branch`
   *
   * Lists all branches
   */
  listBranches = (): Branch[] => {
    return Object.values(this.state.branches)
  }

  /**
   * `git branch --show-current`
   *
   * Gets the current branch name
   */
  getCurrentBranch = (): Branch | undefined => {
    return this.state.branches[this.state.currentBranch.id]
  }

  isDetached = (): boolean => {
    return !!this.state.head.detached
  }
}

declare global {
  var gitSyncedStore: GitSyncedStore | undefined
}

// To keep the state in memory between multiple server requests, we store the instance in the global object globalThis.
// This ensures that Next.js reuses the same GitStore instance as long as the Node process is not restarted.
if (!globalThis.gitSyncedStore) {
  globalThis.gitSyncedStore = new GitSyncedStore(store)
}

export const git = globalThis.gitSyncedStore
