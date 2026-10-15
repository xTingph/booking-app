import { NextResponse } from 'next/server'
import { createCalendarEvent } from '../../../lib/googleCalendar'
import { sendBookingConfirmationEmail } from '../../../lib/email'

function generateCalendarLink(serviceName: string, bookingDate: string, bookingTime: string) {
  let hours = 10, minutes = 0
  const cleanTime = bookingTime.trim().toUpperCase()

  if (cleanTime.includes('AM') || cleanTime.includes('PM')) {
    const [timePart, modifier] = cleanTime.split(' ')
    let [h, m] = timePart.split(':').map(Number)
    if (modifier === 'PM' && h < 12) h += 12
    if (modifier === 'AM' && h === 12) h = 0
    hours = h
    minutes = m || 0
  } else {
    const [h, m] = cleanTime.split(':').map(Number)
    hours = h || 0
    minutes = m || 0
  }

  const startDate = new Date(bookingDate)
  startDate.setHours(hours, minutes, 0, 0)
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000)

  const formatIso = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '')

  const text = encodeURIComponent(`[Booked] ${serviceName}`)
  const details = encodeURIComponent(`Confirmed booking.\nService: ${serviceName}`)
  const dates = `${formatIso(startDate)}/${formatIso(endDate)}`

  return `https://calendar.google.com/calendar/r/eventedit?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}`
}

export async function POST(req: Request) {
  try {
    const { serviceName, userEmail, bookingDate, bookingTime, price } = await req.json()

    if (!userEmail || !bookingDate || !bookingTime) {
      return NextResponse.json({ error: 'Missing required booking details' }, { status: 400 })
    }

    // 1. Log event onto your admin Google Calendar
    await createCalendarEvent({
      serviceName,
      userEmail,
      bookingDate,
      bookingTime,
    })

    // 2. Send receipt and confirmation email to client and admin
    const calendarLink = generateCalendarLink(serviceName, bookingDate, bookingTime)
    await sendBookingConfirmationEmail({
      userEmail,
      serviceName,
      bookingDate,
      bookingTime,
      price: price || '$50.00',
      calendarLink,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('API Calendar & Email Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}