import { NextRequest, NextResponse } from 'next/server'

import { gitStore } from '../../../../../lib/gitStore'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const commitId = params.id
    if (!commitId) {
      return NextResponse.json({ error: 'commitId required' }, { status: 400 })
    }

    const head = gitStore.rollback(commitId)
    if (!head) {
      return NextResponse.json({ error: 'Commit not found' }, { status: 404 })
    }

    return NextResponse.json({ head })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    )
  }
}

export const dynamic = 'force-dynamic'
