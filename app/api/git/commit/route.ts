import { NextRequest, NextResponse } from 'next/server'

import { gitStore } from '../../../lib/gitStore'
import type { Block } from '../../../lib/store'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, blocks } = body as { message?: string; blocks?: Block[] }
    if (!message) {
      return NextResponse.json(
        { error: 'Commit message required' },
        { status: 400 },
      )
    }
    if (!blocks || blocks.length === 0) {
      return NextResponse.json({ error: 'Nothing to commit' }, { status: 400 })
    }
    gitStore.add(blocks)
    const commit = gitStore.commit(message)
    return NextResponse.json({ commit })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    )
  }
}

export const dynamic = 'force-dynamic'
