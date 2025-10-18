import { v4 as uuid } from 'uuid'

import { getYjsDoc, syncedStore } from '@syncedstore/core'

import { Commit } from './gitStore'

export interface Block {
  id: string
  type: 'todo' | 'text' | 'heading'
  title: string
  completed?: boolean
  children: Block[]
}

// List of status callbacks
const statusListeners: Array<(connected: boolean) => void> = []

/**
 * Subscribe to provider status changes (connected / disconnected).
 * The callback is immediately called with the current state if the provider is already initialized.
 */
export function subscribeStatus(listener: (connected: boolean) => void) {
  statusListeners.push(listener)
  if (typeof netProvider?.connected === 'boolean') {
    listener(!!netProvider.connected)
  }

  return () => {
    const index = statusListeners.indexOf(listener)
    if (index > -1) {
      statusListeners.splice(index, 1)
    }
  }
}

interface StoreState {
  blocks: Block[]
  commits: Commit[]
  // Error: Root Object initializer must always be {}
  head: { [key: string]: any } | { id: string }
  [key: string]: any // Add index signature
}

export const store = syncedStore<StoreState>({
  blocks: [],
  commits: [],
  head: {},
})
const doc = getYjsDoc(store)
const roomName = 'next-todo-app-demo'

// Reference to the network provider (webrtc) to be able to connect/disconnect
let netProvider: any

if (typeof window !== 'undefined') {
  // Dynamic import of providers only in the browser
  import('y-webrtc').then(({ WebrtcProvider }) => {
    netProvider = new WebrtcProvider(roomName, doc, {
      // signaling: ['wss://signaling.yjs.dev'], // reliable signaling server
      // optional: limit the number of connections
      maxConns: 20,
      filterBcConns: true,
    })

    // Notify listeners of every status change (for test purposes)
    // netProvider.on('status', (event: { status: string }) => {
    //   const isConnected = event.status === 'connected'
    //   statusListeners.forEach((fn) => fn(isConnected))
    // })

    // notify initial status
    const initialConnected = !!netProvider.connected
    statusListeners.forEach((fn) => fn(initialConnected))
  })
  import('y-indexeddb').then(({ IndexeddbPersistence }) => {
    // Offline persistent storage
    new IndexeddbPersistence(roomName, doc)
  })
}

// Functions to disconnect/reconnect (offline/online mode)
export function disconnect() {
  netProvider?.disconnect()
}

export function connect() {
  netProvider?.connect()
}

export function createTodo(title: string): Block {
  return { id: uuid(), type: 'todo', title, completed: false, children: [] }
}

export function cloneBlocks(blocks: Block[]): Block[] {
  return JSON.parse(JSON.stringify(blocks))
}
