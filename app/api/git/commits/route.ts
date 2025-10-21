import { NextRequest, NextResponse } from 'next/server'

import { gitStore } from '../../../lib/git-store'

export async function GET(_req: NextRequest) {
  try {
    const commits = gitStore.listCommits()

    return NextResponse.json({ commits })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    )
  }
}

export const dynamic = 'force-dynamic'
