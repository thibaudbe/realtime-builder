import { v4 as uuid } from 'uuid'

import type { Block } from './store'

export interface Branch {
  id: string
  name: string
  headId?: string
}

export interface Commit {
  id: string
  message: string
  timestamp: number
  tree: Block[]
  parentId?: string
  branchId: string
}

type Id = string

export class GitStore {
  private commits: Map<Id, Commit> = new Map()
  private staging: Map<Id, Block[]> = new Map()
  private head: Commit | undefined
  private branches: Map<Id, Branch> = new Map()
  private currentBranchId: Id
  private detachedHead: boolean = false

  constructor() {
    if (this.branches.size === 0) {
      const defaultBranch: Branch = {
        id: uuid(),
        name: 'default',
        headId: undefined,
      }
      this.branches.set(defaultBranch.id, defaultBranch)
      this.currentBranchId = defaultBranch.id
    }
  }

  /** -------------- Commits -------------- */

  /**
   * `git add`
   *
   * Stages changes for the next commit
   */
  add = (blocks: Block[]): void => {
    if (!blocks || blocks.length === 0) {
      this.staging.delete(this.currentBranchId)
      return
    }
    this.staging.set(this.currentBranchId, JSON.parse(JSON.stringify(blocks)))
  }

  /**
   * `git commit -m <message>`
   *
   * Records changes to the repository
   */
  commit = (message: string): Commit => {
    const stagedBlocks = this.staging.get(this.currentBranchId)
    if (!stagedBlocks || stagedBlocks.length === 0) {
      throw new Error('Nothing staged to commit')
    }

    const branch = this.branches.get(this.currentBranchId)
    if (!branch) {
      throw new Error(`Current branch "${this.currentBranchId}" not found`)
    }

    const newCommit: Commit = {
      id: uuid(),
      message,
      timestamp: Date.now(),
      tree: this.staging.get(this.currentBranchId) || [],
      parentId: branch.headId,
      branchId: this.currentBranchId,
    }

    this.commits.set(newCommit.id, newCommit)

    branch.headId = newCommit.id
    this.branches.set(this.currentBranchId, branch)

    this.head = newCommit
    this.staging.delete(this.currentBranchId)

    return { ...newCommit }
  }

  /**
   * `git reset --hard <commit>`
   *
   * Moves HEAD to a commit and removes all commits following it in the current branch.
   * ⚠️ Destructive: rewrites the history of the current branch.
   */
  resetToCommit = (id: string): Commit | undefined => {
    const commit = this.commits.get(id)
    if (!commit) {
      throw new Error(`Commit "${id}" not found`)
    }
    if (commit.branchId !== this.currentBranchId) {
      throw new Error(`Commit "${id}" does not belong to current branch`)
    }

    const branch = this.branches.get(this.currentBranchId)
    if (!branch) {
      throw new Error(`Branch "${this.currentBranchId}" not found`)
    }

    const toDelete: string[] = []
    for (const [cid, c] of this.commits.entries()) {
      if (c.branchId === this.currentBranchId) {
        let cursor = c.parentId
        while (cursor) {
          if (cursor === id) {
            toDelete.push(c.id)
            break
          }
          cursor = this.commits.get(cursor)?.parentId
        }
      }
    }

    for (const cid of toDelete) {
      this.commits.delete(cid)
    }

    branch.headId = commit.id
    this.branches.set(this.currentBranchId, branch)
    this.head = commit

    return this.head
  }

  /**
   * `git revert <commit>`
   *
   * Creates a new commit that undoes the changes of the specified commit.
   * Does not modify the previous history.
   */
  revertCommit = (id: string, message?: string): Commit | undefined => {
    const target = this.commits.get(id)
    if (!target) {
      throw new Error(`Commit "${id}" not found`)
    }

    if (target.branchId !== this.currentBranchId) {
      throw new Error(`Commit "${id}" does not belong to current branch`)
    }

    const branch = this.branches.get(this.currentBranchId)
    if (!branch) {
      throw new Error(`Branch "${this.currentBranchId}" not found`)
    }

    const newCommit: Commit = {
      id: uuid(),
      message: message || `revert: ${target.message}`,
      timestamp: Date.now(),
      tree: target.tree,
      parentId: branch.headId,
      branchId: this.currentBranchId,
    }

    this.commits.set(newCommit.id, newCommit)
    branch.headId = newCommit.id
    this.branches.set(this.currentBranchId, branch)
    this.head = newCommit

    return this.head
  }

  /**
   * `git checkout <commit>`
   *
   * Moves HEAD to a commit without changing the current branch.
   * Does not modify the branch structure.
   */
  checkoutCommit = (id: string): Commit | undefined => {
    const commit = this.commits.get(id)
    if (!commit) {
      throw new Error(`Commit "${id}" not found`)
    }

    this.head = commit
    this.detachedHead = true

    return this.head
  }

  /**
   * Deletes a specific commit
   * Similar to `git reset --hard HEAD~1` for the last commit
   * or interactive rebase for a specific commit
   */
  deleteCommit = (id: string): Commit[] => {
    const commit = this.commits.get(id)
    if (!commit) {
      throw new Error(`Commit "${id}" not found`)
    }

    const successDelete = this.commits.delete(id)
    if (!successDelete) {
      throw new Error(`Unable to delete commit "${id}"`)
    }

    const branch = this.branches.get(this.currentBranchId)
    if (!branch) {
      throw new Error(`Branch "${this.currentBranchId}" not found`)
    }

    if (branch.headId === commit.id) {
      const previous = commit.parentId
        ? this.commits.get(commit.parentId)
        : undefined
      branch.headId = previous?.id
      this.head = previous
      this.branches.set(this.currentBranchId, branch)
    }

    return this.listCommits()
  }

  /** `git show <commit>`
   *
   * Shows commit details */
  getCommit = (id: string): Commit | undefined => {
    const commit = this.commits.get(id)
    return commit ? { ...commit } : undefined
  }

  /**
   * `git log`
   *
   * Shows commit history for current branch from HEAD to the first commit
   */
  listCommits = (): Commit[] => {
    const branch = this.branches.get(this.currentBranchId)
    if (!branch?.headId) return []

    const commits: Commit[] = []
    const visited = new Set<string>()
    let currentId = branch.headId

    while (currentId && !visited.has(currentId)) {
      const commit = this.commits.get(currentId)
      if (!commit) break

      visited.add(commit.id)
      commits.push({ ...commit })
      currentId = commit.parentId
    }

    return commits
  }

  /**
   * `git rev-parse HEAD`
   *
   * Returns the current HEAD commit
   */
  getHead = (): Commit | undefined => {
    return this.head
  }

  /** -------------- Branches -------------- */

  /**
   * `git branch <branch-name>`
   *
   * Creates a new branch
   */
  createBranch = (name: string, fromCommitId?: string): Branch => {
    const sourceBranch = this.branches.get(this.currentBranchId)
    if (!sourceBranch) {
      throw new Error(`Current branch "${this.currentBranchId}" not found`)
    }

    const newBranch: Branch = {
      name,
      id: uuid(),
      headId: undefined,
    }

    if (fromCommitId) {
      const commit = this.commits.get(fromCommitId)
      if (commit) {
        newBranch.headId = commit.id
      }
    }

    this.branches.set(newBranch.id, newBranch)

    return { ...newBranch }
  }

  /**
   * `git branch -d <branch>`
   *
   * Deletes a branch
   */
  deleteBranch = (branchId: string): boolean => {
    if (!this.branches.has(branchId)) {
      throw new Error(`Branch "${branchId}" not found`)
    }
    if (branchId === this.currentBranchId) {
      throw new Error('Cannot delete the currently active branch')
    }

    const successDelete = this.branches.delete(branchId)
    if (!successDelete) {
      throw new Error(`Unable to delete branch "${branchId}"`)
    }

    return successDelete
  }

  /**
   * `git checkout <branch>`
   *
   * Switches branches
   */
  checkoutBranch = (branchId: string): boolean => {
    const branchToCheckout = this.branches.get(branchId)
    if (!branchToCheckout) {
      throw new Error(`Branch "${branchId}" not found`)
    }

    this.currentBranchId = branchToCheckout.id
    this.detachedHead = false

    this.head = branchToCheckout.headId
      ? this.commits.get(branchToCheckout.headId)
      : undefined

    return true
  }

  /**
   * `git clone --single-branch --branch <branch>`
   *
   * Creates a new branch from the current branch with the same commit history
   */
  cloneBranch = (name: string, fullHistory = false): Branch => {
    const sourceBranch = this.branches.get(this.currentBranchId)
    if (!sourceBranch) {
      throw new Error('Current branch not found')
    }

    const newBranch: Branch = {
      name,
      id: uuid(),
      headId: sourceBranch.headId,
    }

    if (fullHistory && sourceBranch.headId) {
      const chain: Commit[] = []
      let curId = sourceBranch.headId
      while (curId) {
        const commit = this.commits.get(curId)
        if (!commit) break
        chain.unshift(commit)
        curId = commit.parentId ?? ''
      }

      let prevNewId: string | undefined = undefined
      for (const commit of chain) {
        const newCommit: Commit = {
          id: uuid(),
          message: commit.message,
          timestamp: commit.timestamp,
          tree: JSON.parse(JSON.stringify(commit.tree)),
          parentId: prevNewId,
          branchId: newBranch.id,
        }
        this.commits.set(newCommit.id, newCommit)
        prevNewId = newCommit.id
      }
      newBranch.headId = prevNewId
    }

    this.branches.set(newBranch.id, newBranch)

    return { ...newBranch }
  }

  isDetached = (): boolean => {
    return this.detachedHead
  }

  /**
   * `git branch`
   *
   * Lists all branches
   */
  listBranches = (): Branch[] => {
    return [...this.branches.values()]
  }

  /**
   * `git branch --show-current`
   *
   * Gets the current branch name
   */
  getCurrentBranch = (): Branch | undefined => {
    const branch = this.branches.get(this.currentBranchId)
    return branch ? { ...branch } : undefined
  }
}

declare global {
  var gitStore: GitStore | undefined
}

// To keep the state in memory between multiple server requests, we store the instance in the global object globalThis.
// This ensures that Next.js reuses the same GitStore instance as long as the Node process is not restarted.
if (!globalThis.gitStore) {
  globalThis.gitStore = new GitStore()
}

export const gitStore = globalThis.gitStore
