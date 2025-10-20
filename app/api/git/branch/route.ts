import { NextRequest, NextResponse } from 'next/server'

import { gitStore } from '../../../lib/gitStore'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const { name, fromCommitId } = body as {
      name?: string
      fromCommitId?: string
    }

    if (!name) {
      return NextResponse.json(
        { error: 'Branch name required' },
        { status: 400 },
      )
    }

    gitStore.createBranch(name, fromCommitId)
    const branches = gitStore.listBranches()
    const currentBranch = gitStore.getCurrentBranch()

    return NextResponse.json({ branches, currentBranch })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    )
  }
}

export const dynamic = 'force-dynamic'
