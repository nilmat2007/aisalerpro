import { NextResponse } from 'next/server'
import { processTrialFollowUps } from '@/lib/trial-followup'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const result = await processTrialFollowUps()
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      ...result
    })
  } catch (error: any) {
    console.error('Cron follow-up error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
