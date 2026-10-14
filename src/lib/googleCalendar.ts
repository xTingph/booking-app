import { google } from 'googleapis'

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/calendar'],
})

const calendar = google.calendar({ version: 'v3', auth })

// Helper to parse times like "10:00 AM", "02:00 PM", or "14:00"
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
    // 24-hour format (e.g., "14:00")
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
      sendUpdates: 'all', // Tells Google to email the calendar invite to all attendees
      requestBody: {
        summary: `📅 [Booked] ${serviceName}`,
        description: `Client: ${userEmail}\nService: ${serviceName}\nBooked via Booking Platform.`,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: 'Asia/Manila', // Change to your local timezone if needed
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: 'Asia/Manila',
        },
        attendees: [{ email: userEmail }], // Automatically invites the client
      },
    })
    console.log('Google Calendar event and client invite created successfully:', response.data.htmlLink)
  } catch (error) {
    console.error('Error creating Google Calendar event:', error)
  }
}