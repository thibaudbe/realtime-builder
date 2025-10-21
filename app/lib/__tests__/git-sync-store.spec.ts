import { get } from 'http'

import { beforeEach, describe, expect, it } from 'vitest'

import { syncedStore } from '@syncedstore/core'

import { GitSyncedStore } from '../git-synced-store'
import type { Branch, Commit } from '../gitStore'
import type { Block } from '../store'

function createMockStore() {
  return syncedStore({
    commits: [] as Commit[],
    branches: {} as Record<string, Branch>,
    currentBranch: {} as { id: string | null },
    head: {} as { id: string | null; detached: boolean },
    blocks: [] as Block[],
  })
}

describe('GitSyncedStore', () => {
  let git: GitSyncedStore
  let store: ReturnType<typeof createMockStore>

  beforeEach(() => {
    store = createMockStore()
    git = new GitSyncedStore(store)

    git.createBranch('default')
  })

  describe('commit', () => {
    it('should start with undefined head', () => {
      expect(git.getHead()).toBeUndefined()
    })

    it('should create a commit and update head', () => {
      git.add([{ id: '1', type: 'todo', title: 'A', children: [] }])
      const c1 = git.commit('c1')
      expect(c1).toHaveProperty('id')
      expect(git.getHead()?.id).toEqual(c1.id)
    })

    it('should list commits in chronological order', () => {
      git.add([{ id: '1', type: 'todo', title: 'A', children: [] }])
      const c1 = git.commit('c1')
      git.add([
        { id: '3', type: 'todo', title: 'C', children: [] },
        { id: '4', type: 'todo', title: 'D', children: [] },
      ])
      const c2 = git.commit('c2')

      const cs = git.listCommits()
      expect(cs.map((c) => c.id)).toEqual([c2.id, c1.id])
    })

    it('should resetToCommit and remove later commits', () => {
      git.add([{ id: '1', type: 'todo', title: 'A', children: [] }])
      const c1 = git.commit('c1')
      git.add([{ id: '2', type: 'todo', title: 'B', children: [] }])
      git.commit('c2')
      git.add([{ id: '3', type: 'todo', title: 'C', children: [] }])
      git.commit('c3')

      expect(git.listCommits()).toHaveLength(3)
      git.resetToCommit(c1.id)

      expect(git.listCommits()).toHaveLength(1)
      expect(git.getHead()?.id).toBe(c1.id)
    })

    it('should revertCommit and add an inverse commit', () => {
      git.add([{ id: '1', type: 'todo', title: 'A', children: [] }])
      const c1 = git.commit('c1')

      git.revertCommit(c1.id, 'revert: c1')

      const cs = git.listCommits()
      expect(cs).toHaveLength(2)
      expect(cs[0].message).toBe('revert: c1')
      expect(cs[1].message).toBe('c1')
    })

    it('should checkoutCommit without modifying branch head', () => {
      git.add([{ id: '1', type: 'todo', title: 'A', children: [] }])
      const c1 = git.commit('c1')
      git.add([{ id: '2', type: 'todo', title: 'B', children: [] }])
      const c2 = git.commit('c2')

      git.checkoutCommit(c1.id)
      expect(git.getHead()?.id).toBe(c1.id)

      const b = git.getCurrentBranch()!
      expect(b.headId).toBe(c2.id)
      expect(git.isDetached()).toBe(true)
    })

    it('should delete the head commit and update head', () => {
      git.add([{ id: '1', type: 'todo', title: 'A', children: [] }])
      const c1 = git.commit('c1')
      expect(git.listCommits()).toHaveLength(1)

      git.deleteCommit(c1.id)
      expect(git.listCommits()).toHaveLength(0)
    })
  })

  describe('branch', () => {
    it('should have a default branch initially', () => {
      const b1 = git.getCurrentBranch()
      expect(b1?.name).toBe('default')
      expect(git.listBranches()).toHaveLength(1)
    })

    it('should create new branches', () => {
      const b1 = git.createBranch('b1')
      const b2 = git.createBranch('b2')
      expect(git.listBranches()).toHaveLength(3)
      expect(b1.name).toBe('b1')
      expect(b2.name).toBe('b2')
    })

    it('should prevent deleting the active branch', () => {
      expect(() => git.deleteBranch(git.getCurrentBranch()!.id)).toThrow(
        'Cannot delete active branch',
      )
    })

    it('should delete a non-active branch', () => {
      const main = git.getCurrentBranch()
      expect(git.listBranches()).toHaveLength(1)

      const b1 = git.createBranch('b1')
      expect(git.listBranches()).toHaveLength(2)
      expect(git.getCurrentBranch()?.id).toBe(b1.id)

      git.checkoutBranch(main.id)
      git.deleteBranch(b1.id)
      expect(git.listBranches()).toHaveLength(1)
    })

    it('should checkout another branch', () => {
      const b1 = git.createBranch('b1')
      git.checkoutBranch(b1.id) // auto checkout on create
      expect(git.getCurrentBranch()?.id).toBe(b1.id)
      expect(git.isDetached()).toBe(false)
    })

    it('should isolate commits per branch', () => {
      const main = git.getCurrentBranch()
      git.add([{ id: '1', type: 'todo', title: 'A', children: [] }])
      const c1 = git.commit('c1')

      // new branch
      git.createBranch('b2')
      expect(git.listCommits()).toHaveLength(1)

      git.add([
        { id: '1', type: 'todo', title: 'A', children: [] },
        { id: '2', type: 'todo', title: 'B', children: [] },
      ])
      const c2 = git.commit('c2')
      const csB2 = git.listCommits()
      expect(csB2).toHaveLength(2)
      expect(csB2[0].message).toBe('c2')
      expect(csB2[1].message).toBe('c1')
      expect(csB2[0].id).toBe(c2.id)
      expect(csB2[1].id).toBe(c1.id)

      // back to main
      git.checkoutBranch(main.id)

      expect(git.listCommits()).toHaveLength(1)
      expect(git.getHead()?.id).toBe(c1.id)
    })

    it('should isolate commits per branch (advanced history)', () => {
      const main = git.getCurrentBranch()

      git.add([{ id: '1', type: 'todo', title: 'A', children: [] }])
      const c1 = git.commit('c1')
      git.add([{ id: '2', type: 'todo', title: 'B', children: [] }])
      const c2 = git.commit('c2')
      git.add([{ id: '3', type: 'todo', title: 'C', children: [] }])
      const c3 = git.commit('c3')

      const b1 = git.createBranch('b1', c2.id)
      git.checkoutBranch(b1.id)

      git.add([{ id: '4', type: 'todo', title: 'D', children: [] }])
      git.commit('b1c1')

      git.checkoutBranch(main.id)
      git.add([{ id: '5', type: 'todo', title: 'E', children: [] }])
      git.commit('c4')

      const csMain = git.listCommits()
      expect(csMain.map((c) => c.message)).toEqual(['c4', 'c3', 'c2', 'c1'])

      git.checkoutBranch(b1.id)
      const csB1 = git.listCommits()
      expect(csB1.map((c) => c.message)).toEqual(['b1c1', 'c2', 'c1'])
    })

    it.skip('should not leak commits from another branch if parent chain is corrupted', () => {
      // main: c1 → c2 → c3
      git.add([{ id: '1', type: 'todo', title: 'A', children: [] }])
      const c1 = git.commit('c1')
      git.add([{ id: '2', type: 'todo', title: 'B', children: [] }])
      const c2 = git.commit('c2')
      git.add([{ id: '3', type: 'todo', title: 'C', children: [] }])
      const c3 = git.commit('c3')

      // new branch from c2
      const feature = git.createBranch('feature', c2.id)
      git.checkoutBranch(feature.id)
      git.add([{ id: '4', type: 'todo', title: 'Feature', children: [] }])
      const f1 = git.commit('f1')

      // 🔥 Corrupt the parent chain (simulate a detached HEAD mixup)
      // f1 now points to c3 (from another branch)
      const f1Index = store.commits.findIndex((c) => c.id === f1.id)
      store.commits[f1Index].parentId = c3.id

      // back to feature
      git.checkoutBranch(feature.id)
      const featureCommits = git.listCommits()

      // ❌ Current implementation will include c3 (wrong)
      // ✅ Correct behavior: should *not* see commits from main
      expect(featureCommits.map((c) => c.message)).not.toContain('c3')
    })

    it('should clone a branch with all its commits', () => {
      git.add([{ id: '1', type: 'todo', title: 'A', children: [] }])
      git.commit('c1')
      git.add([{ id: '2', type: 'todo', title: 'B', children: [] }])
      const c2 = git.commit('c2')

      const b2 = git.cloneBranch('b2')
      expect(b2.name).toBe('b2')
      expect(b2.headId).toBe(c2.id)

      git.checkoutBranch(b2.id)
      const csB2 = git.listCommits()
      expect(csB2).toHaveLength(2)
      expect(csB2[0].message).toBe('c2')
      expect(csB2[1].message).toBe('c1')

      git.checkoutBranch(
        git.listBranches().find((b) => b.name === 'default')!.id,
      )
      git.add([{ id: '3', type: 'todo', title: 'C', children: [] }])
      git.commit('c3')

      git.checkoutBranch(b2.id)
      expect(git.listCommits()).toHaveLength(2)
    })

    it('should create a new branch sharing the same head when fullyClone = false', () => {
      git.add([{ id: '1', type: 'todo', title: 'A', children: [] }])
      const c1 = git.commit('c1')

      const b2 = git.cloneBranch('b1')
      expect(b2).toHaveProperty('id')
      expect(b2.name).toBe('b1')
      expect(b2.headId).toBe(c1.id)

      const csB1 = git.listCommits()
      expect(csB1.map((c) => c.id)).toEqual([c1.id])

      git.checkoutBranch(b2.id)
      git.add([{ id: '2', type: 'todo', title: 'B', children: [] }])
      const c2 = git.commit('c2')
      expect(git.getHead()?.id).toBe(c2.id)

      const b2Ref = git.getCurrentBranch()
      expect(b2Ref?.id).toBe(b2.id)
      expect(b2Ref?.headId).toBe(c2.id)

      const csB2 = git.listCommits()
      expect(csB2.map((c) => c.id)).toEqual([c2.id, c1.id])
    })

    it.skip('should clone full history when fullyClone = true', () => {
      const main = git.getCurrentBranch()!

      git.add([{ id: '1', type: 'todo', title: 'A', children: [] }])
      const c1 = git.commit('c1')
      git.add([
        { id: '2', type: 'todo', title: 'B', children: [] },
        { id: '3', type: 'todo', title: 'C', children: [] },
      ])
      const c2 = git.commit('c2')
      expect(git.getHead()?.id).toBe(c2.id)

      const b3 = git.cloneBranch('b3', true)
      expect(b3).toHaveProperty('id')
      expect(b3.name).toBe('b3')
      expect(b3.headId).not.toBeUndefined()
      expect(b3.headId).not.toBe(c2.id)

      git.checkoutBranch(b3.id)
      const csB3 = git.listCommits()
      expect(csB3.length).toBe(2)
      // expect(csB3.map((c) => c.id)).toEqual([c1.id, c2.id])
      const messages = csB3.map((c) => c.message)
      expect(messages).toEqual(['c1', 'c2'])

      expect(csB3[0].id).not.toBe(c1.id)
      expect(csB3[1].id).not.toBe(c2.id)

      expect(csB3[1].parentId).toBe(csB3[0].id)
      expect(csB3[0].parentId).toBeUndefined()

      git.checkoutBranch(main.id)
      const csMain = git.listCommits()
      expect(csMain.length).toBe(2)
      expect(csMain.map((c) => c.id)).toEqual([c2.id, c1.id])
    })
  })
})
