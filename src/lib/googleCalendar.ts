import { google } from 'googleapis'

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/calendar'],
})

const calendar = google.calendar({ version: 'v3', auth })

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
    const startDateTime = new Date(`${bookingDate}T${bookingTime}:00`)
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000)

    await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      requestBody: {
        summary: `📅 [Booked] ${serviceName}`,
        description: `Client: ${userEmail}\nService: ${serviceName}\nBooked via Booking Platform.`,
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
    console.log('Google Calendar event created successfully!')
  } catch (error) {
    console.error('Error creating Google Calendar event:', error)
  }
}