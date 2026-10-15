import { google } from 'googleapis'

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/calendar'],
})

const calendar = google.calendar({ version: 'v3', auth })

function parseBookingDateTime(bookingDate: string, bookingTime: string) {
  let hours = 10
  let minutes = 0
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

  const startDateTime = new Date(bookingDate)
  startDateTime.setHours(hours, minutes, 0, 0)
  return startDateTime
}

export async function createCalendarEvent({
  serviceName,
  userEmail,
  bookingDate,
  bookingTime,
}: {
  serviceName: string
  userEmail: string
  bookingDate: string
  bookingTime: string
}) {
  try {
    const startDateTime = parseBookingDateTime(bookingDate, bookingTime)
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000) // 1 hour duration

    const response = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      requestBody: {
        summary: `📅 [Booked] ${serviceName}`,
        description: `Client Email: ${userEmail}\nService: ${serviceName}\nBooked via Booking Platform.`,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: 'Asia/Manila',
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: 'Asia/Manila',
        },
      },
    })
    console.log('Calendar event created successfully:', response.data.htmlLink)
    return { success: true }
  } catch (error: any) {
    console.error('Error creating Google Calendar event:', error.message)
    throw error
  }
}