import { NextRequest, NextResponse } from 'next/server'

import { gitStore } from '../../../../lib/gitStore'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const commitId = params.id
    if (!commitId) {
      return NextResponse.json({ error: 'commitId required' }, { status: 400 })
    }

    const commits = gitStore.delete(commitId)
    const head = gitStore.getHead()

    return NextResponse.json({
      success: true,
      commits,
      head: head
        ? {
            id: head.id,
            tree: head.tree,
          }
        : null,
    })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    )
  }
}

export const dynamic = 'force-dynamic'
