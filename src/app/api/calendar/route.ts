import { NextResponse } from 'next/server'
import { createCalendarEvent } from '../../../lib/googleCalendar'

export async function POST(req: Request) {
  try {
    const { serviceName, userEmail, bookingDate, bookingTime } = await req.json()

    await createCalendarEvent({
      serviceName,
      userEmail,
      bookingDate,
      bookingTime,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('API Calendar Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}