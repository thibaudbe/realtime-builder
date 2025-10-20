import { NextRequest, NextResponse } from 'next/server'

import { gitStore } from '../../../../lib/gitStore'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }

    const result = gitStore.deleteBranch(id)
    const branches = gitStore.listBranches()
    const currentBranch = gitStore.getCurrentBranch()

    return NextResponse.json({ deleted: result, branches, currentBranch })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    )
  }
}

export const dynamic = 'force-dynamic'
