import { NextRequest, NextResponse } from 'next/server'

import { gitStore } from '../../../lib/gitStore'

export async function GET(_req: NextRequest) {
  try {
    const branches = gitStore.listBranches()
    const currentBranch = gitStore.getCurrentBranch()

    return NextResponse.json({ branches, currentBranch })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    )
  }
}

export const dynamic = 'force-dynamic'
