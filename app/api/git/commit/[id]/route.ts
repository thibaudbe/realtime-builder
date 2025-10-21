import { NextRequest, NextResponse } from 'next/server'

import { gitStore } from '../../../../lib/git-store'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }

    const commits = gitStore.deleteCommit(id)
    const head = gitStore.getHead()

    return NextResponse.json({
      commits,
      head,
    })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    )
  }
}

export const dynamic = 'force-dynamic'
