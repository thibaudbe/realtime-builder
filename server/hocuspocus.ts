import { Server } from '@hocuspocus/server'

import { GitDocumentExtension } from './extensions/git-document'

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080

const server = new Server({
  port: PORT,
  timeout: 30000, // Healthcheck interval
  debounce: 5000, // Otherwise every single update would be persisted
  maxDebounce: 30000, // Maximum debounce time
  quiet: true,

  extensions: [new GitDocumentExtension()],

  async onConnect(data) {
    console.log(`🔗 Client connected: ${data.documentName}`)
  },

  // async onLoadDocument({ documentName }) {
  //   console.log(`📄 Loading document: ${documentName}`)
  // },

  // async onStoreDocument(data) {
  //   console.log(`💾 Storing document: ${data.documentName}`)
  // },
})

server.listen()

console.log(`✅ Hocuspocus running at ws://0.0.0.0:${PORT}`)
