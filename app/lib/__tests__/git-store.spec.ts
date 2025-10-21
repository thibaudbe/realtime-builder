import { beforeEach, describe, expect, it } from 'vitest'

import { GitStore } from '../git-store'

describe('gitStore', () => {
  let gitStore: GitStore

  beforeEach(() => {
    gitStore = new GitStore()
  })

  describe('commit', () => {
    it('should start with undefined head', () => {
      expect(gitStore.getHead()).toBeUndefined()
    })

    it('should create a commit and update head', () => {
      gitStore.add([{ id: '1', type: 'todo', title: 'A', children: [] }])
      const c1 = gitStore.commit('c1')
      expect(c1).toHaveProperty('id')
      expect(gitStore.getHead()?.id).toEqual(c1.id)
    })

    it('should list commits in chronological order', () => {
      gitStore.add([{ id: '1', type: 'todo', title: 'A', children: [] }])
      const c1 = gitStore.commit('c1')
      gitStore.add([
        { id: '3', type: 'todo', title: 'C', children: [] },
        { id: '4', type: 'todo', title: 'D', children: [] },
      ])
      const c2 = gitStore.commit('c2')

      const cs = gitStore.listCommits()
      expect(cs.map((c) => c.id)).toEqual([c2.id, c1.id])
    })

    it('should resetToCommit and remove later commits', () => {
      gitStore.add([{ id: '1', type: 'todo', title: 'A', children: [] }])
      const c1 = gitStore.commit('c1')
      gitStore.add([{ id: '2', type: 'todo', title: 'B', children: [] }])
      gitStore.commit('c2')
      gitStore.add([{ id: '3', type: 'todo', title: 'C', children: [] }])
      gitStore.commit('c3')

      expect(gitStore.listCommits()).toHaveLength(3)
      gitStore.resetToCommit(c1.id)

      expect(gitStore.listCommits()).toHaveLength(1)
      expect(gitStore.getHead()?.id).toBe(c1.id)
    })

    it('should revertCommit and add an inverse commit', () => {
      gitStore.add([{ id: '1', type: 'todo', title: 'A', children: [] }])
      const c1 = gitStore.commit('add A')

      gitStore.revertCommit(c1.id, 'revert A')

      const cs = gitStore.listCommits()
      expect(cs).toHaveLength(2)
      expect(cs[0].message).toBe('revert A') // HEAD first
      expect(cs[1].message).toBe('add A')
    })

    it('should checkoutCommit without modifying branch head', () => {
      gitStore.add([{ id: '1', type: 'todo', title: 'A', children: [] }])
      const c1 = gitStore.commit('c1')
      gitStore.add([{ id: '2', type: 'todo', title: 'B', children: [] }])
      const c2 = gitStore.commit('c2')

      gitStore.checkoutCommit(c1.id)
      expect(gitStore.getHead()?.id).toBe(c1.id)

      const b = gitStore.getCurrentBranch()!
      expect(b.headId).toBe(c2.id)

      expect(gitStore.isDetached()).toBe(true)
    })

    it('should delete the head commit and update head', () => {
      gitStore.add([{ id: '1', type: 'todo', title: 'A', children: [] }])
      const c1 = gitStore.commit('c1')
      expect(gitStore.listCommits()).toHaveLength(1)

      gitStore.deleteCommit(c1.id)
      expect(gitStore.listCommits()).toHaveLength(0)
    })
  })

  describe('branch', () => {
    it('should have a default branch initially', () => {
      const b1 = gitStore.getCurrentBranch()
      expect(b1?.name).toBe('default')
      expect(gitStore.listBranches()).toHaveLength(1)
    })

    it('should create new branches', () => {
      const b1 = gitStore.createBranch('feature')
      const b2 = gitStore.createBranch('fix')
      expect(gitStore.listBranches()).toHaveLength(3)
      expect(b1.name).toBe('feature')
      expect(b2.name).toBe('fix')
    })

    it('should prevent deleting the active branch', () => {
      expect(() =>
        gitStore.deleteBranch(gitStore.getCurrentBranch()!.id),
      ).toThrow('Cannot delete the currently active branch')
    })

    it('should delete a non-active branch', () => {
      const b = gitStore.createBranch('feature')
      expect(gitStore.listBranches()).toHaveLength(2)
      gitStore.deleteBranch(b.id)
      expect(gitStore.listBranches()).toHaveLength(1)
    })

    it('should checkout another branch', () => {
      const branch = gitStore.createBranch('feature')
      gitStore.checkoutBranch(branch.id)
      expect(gitStore.getCurrentBranch()?.id).toBe(branch.id)
      expect(gitStore.isDetached()).toBe(false)
    })

    it('should isolate commits per branch', () => {
      const main = gitStore.getCurrentBranch()
      gitStore.add([{ id: '1', type: 'todo', title: 'A', children: [] }])
      const c1 = gitStore.commit('c1')

      // new branch
      const b2 = gitStore.createBranch('feature')
      gitStore.checkoutBranch(b2.id)
      expect(gitStore.listCommits()).toHaveLength(1)

      gitStore.add([
        { id: '1', type: 'todo', title: 'A', children: [] },
        { id: '2', type: 'todo', title: 'B', children: [] },
      ])
      gitStore.commit('c2')
      expect(gitStore.listCommits()).toHaveLength(2)

      // back to main
      gitStore.checkoutBranch(main.id)

      expect(gitStore.listCommits()).toHaveLength(1)
      expect(gitStore.getHead()?.id).toBe(c1.id)
    })

    it('should clone a branch with all its commits', () => {
      gitStore.add([{ id: '1', type: 'todo', title: 'A', children: [] }])
      gitStore.commit('c1')
      gitStore.add([{ id: '2', type: 'todo', title: 'B', children: [] }])
      const c2 = gitStore.commit('c2')

      const b2 = gitStore.cloneBranch('b2')
      expect(b2.name).toBe('b2')
      expect(b2.headId).toBe(c2.id)

      gitStore.checkoutBranch(b2.id)
      const csB2 = gitStore.listCommits()
      expect(csB2).toHaveLength(2)
      expect(csB2[0].message).toBe('c2')
      expect(csB2[1].message).toBe('c1')

      gitStore.checkoutBranch(
        gitStore.listBranches().find((b) => b.name === 'default')!.id,
      )
      gitStore.add([{ id: '3', type: 'todo', title: 'C', children: [] }])
      gitStore.commit('c3')

      gitStore.checkoutBranch(b2.id)
      expect(gitStore.listCommits()).toHaveLength(2)
    })

    it('should create a new branch sharing the same head when fullyClone = false', () => {
      gitStore.add([{ id: '1', type: 'todo', title: 'A', children: [] }])
      const c1 = gitStore.commit('first commit')
      // expect(gitStore.getHead()?.id).toBe(c1.id)

      const b2 = gitStore.cloneBranch('b1')
      // expect(gitStore.getHead()?.id).toBe(c1.id)
      expect(b2).toHaveProperty('id')
      expect(b2.name).toBe('b1')
      expect(b2.headId).toBe(c1.id)

      const csB1 = gitStore.listCommits()
      expect(csB1.map((c) => c.id)).toEqual([c1.id])

      gitStore.checkoutBranch(b2.id)
      gitStore.add([{ id: '2', type: 'todo', title: 'B', children: [] }])
      const c2 = gitStore.commit('c2')
      expect(gitStore.getHead()?.id).toBe(c2.id)

      const b2Ref = gitStore.getCurrentBranch()
      expect(b2Ref?.id).toBe(b2.id)
      expect(b2Ref?.headId).toBe(c2.id)

      const csB2 = gitStore.listCommits()
      expect(csB2.map((c) => c.id)).toEqual([c2.id, c1.id])
    })

    it.skip('should clone full history when fullyClone = true', () => {
      const main = gitStore.getCurrentBranch()!

      gitStore.add([{ id: '1', type: 'todo', title: 'A', children: [] }])
      const c1 = gitStore.commit('c1')
      gitStore.add([
        { id: '2', type: 'todo', title: 'B', children: [] },
        { id: '3', type: 'todo', title: 'C', children: [] },
      ])
      const c2 = gitStore.commit('c2')
      expect(gitStore.getHead()?.id).toBe(c2.id)

      const b3 = gitStore.cloneBranch('b3', true)
      expect(b3).toHaveProperty('id')
      expect(b3.name).toBe('b3')
      expect(b3.headId).not.toBeUndefined()
      expect(b3.headId).not.toBe(c2.id)

      gitStore.checkoutBranch(b3.id)
      const csB3 = gitStore.listCommits()
      expect(csB3.length).toBe(2)
      const messages = csB3.map((c) => c.message)
      expect(messages).toEqual(['c1', 'c2'])

      expect(csB3[0].id).not.toBe(c1.id)
      expect(csB3[1].id).not.toBe(c2.id)

      expect(csB3[1].parentId).toBe(csB3[0].id)
      expect(csB3[0].parentId).toBeUndefined()

      gitStore.checkoutBranch(main.id)
      const csMain = gitStore.listCommits()
      expect(csMain.length).toBe(2)
      expect(csMain.map((c) => c.id)).toEqual([c2.id, c1.id])
    })
  })
})
