import { NextRequest, NextResponse } from 'next/server'

import { gitStore } from '../../../../../lib/git-store'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }

    const head = gitStore.checkoutCommit(id)
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
