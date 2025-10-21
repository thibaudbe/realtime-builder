import path from 'path'
import { v4 as uuid } from 'uuid'
import fs from 'fs/promises'

import {
  type Extension,
  type onLoadDocumentPayload,
  type onStoreDocumentPayload,
} from '@hocuspocus/server'
import { Y } from '@syncedstore/core'

const DATA_DIR = './data'

async function ensureDataDir() {
  const dir = path.join(DATA_DIR)
  await fs.mkdir(dir, { recursive: true })
}

function getfilePath(documentName: string) {
  return path.join(DATA_DIR, `${documentName}.json`)
}

function saveDocument(document: Y.Doc, documentName: string) {
  const update = Y.encodeStateAsUpdate(document)
  const json = JSON.stringify(Array.from(update))
  fs.writeFile(getfilePath(documentName), json, 'utf8')
}

export class GitDocumentExtension implements Extension {
  async onLoadDocument({ document, documentName }: onLoadDocumentPayload) {
    await ensureDataDir()
    const file = getfilePath(documentName)

    try {
      const raw = await fs.readFile(file, 'utf8')
      const update = Uint8Array.from(JSON.parse(raw))
      Y.applyUpdate(document, update)

      console.log(`✅ Document "${documentName}" loaded`)
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.log(
          `ℹ️ New document "${documentName}" — default initialization.`,
        )
        const branchesMap = new Y.Map()
        const branchId = uuid()
        const branchMap = new Y.Map()
        branchMap.set('id', branchId)
        branchMap.set('name', 'default')
        branchMap.set('headId', null)
        branchesMap.set(branchId, branchMap)
        document.getMap('branches').set(branchId, branchMap)
        document.getMap('currentBranch').set('id', branchId)

        await saveDocument(document, documentName)
      } else {
        console.error(`❌ Error reading file ${file}`, err)
      }

      return document
    }
  }

  async onStoreDocument({ document, documentName }: onStoreDocumentPayload) {
    await ensureDataDir()

    try {
      await saveDocument(document, documentName)

      console.log(`💾 Storing document: ${documentName}`)
    } catch (err) {
      console.error('❌ Error while storing document:', err)
    }
  }
}
