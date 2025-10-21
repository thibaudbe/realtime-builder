import { v4 as uuid } from 'uuid'

import { HocuspocusProvider } from '@hocuspocus/provider'
import { getYjsDoc, syncedStore } from '@syncedstore/core'

import { useProviderStatus } from '../store/use-provider-status.store'
import { Branch, Commit } from './gitStore'

export interface Block {
  id: string
  type: 'todo' | 'text' | 'heading'
  title: string
  completed?: boolean
  children: Block[]
}

export const store = syncedStore({
  blocks: [] as Block[],
  commits: [] as Commit[],
  head: {} as { id?: string; detached?: boolean },
  branches: {} as Record<string, Branch>,
  currentBranch: {} as { id: string },
})

export type Store = typeof store

const ydoc = getYjsDoc(store)
const roomName = 'blue-sparrow'

const provider = new HocuspocusProvider({
  url: 'ws://172.20.10.2:8080',
  name: roomName,
  document: ydoc,
})

provider.on('status', (event) => {
  useProviderStatus.getState().setStatus(event.status)
})

if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
  import('y-indexeddb').then(({ IndexeddbPersistence }) => {
    // Offline persistent storage
    new IndexeddbPersistence(roomName, ydoc)
  })
}

// Functions to disconnect/reconnect (offline/online mode)
export function disconnect() {
  provider.disconnect()
}

export function connect() {
  provider.connect()
}

export function createBlock(title: string): Block {
  return { id: uuid(), type: 'todo', title, completed: false, children: [] }
}
