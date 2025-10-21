import { NextRequest, NextResponse } from 'next/server'

import { gitStore } from '../../../../../lib/git-store'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }

    const success = gitStore.checkoutBranch(id)
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to checkout branch' },
        { status: 400 },
      )
    }

    const head = gitStore.getHead()
    const commits = gitStore.listCommits()
    const currentBranch = gitStore.getCurrentBranch()

    return NextResponse.json({ head, commits, currentBranch })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    )
  }
}

export const dynamic = 'force-dynamic'
