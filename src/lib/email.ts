import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

export async function sendBookingConfirmationEmail({
  userEmail,
  serviceName,
  bookingDate,
  bookingTime,
  price,
  calendarLink,
}: {
  userEmail: string
  serviceName: string
  bookingDate: string
  bookingTime: string
  price?: string
  calendarLink: string
}) {
  try {
    // 1. Send confirmation & itemized receipt email to the CLIENT
    await transporter.sendMail({
      from: `"Booking Platform" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `Booking Confirmed & Receipt: ${serviceName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc;">
          <h2 style="color: #4f46e5; margin-top: 0;">Booking Confirmed! 🎉</h2>
          <p style="color: #334155; font-size: 16px;">Thank you for your payment. Your appointment has been successfully scheduled.</p>
          
          <!-- Appointment Schedule -->
          <div style="background: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1e293b; font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">📅 Appointment Schedule</h3>
            <p style="margin: 6px 0; color: #1e293b;"><strong>Service:</strong> ${serviceName}</p>
            <p style="margin: 6px 0; color: #1e293b;"><strong>Date:</strong> ${bookingDate}</p>
            <p style="margin: 6px 0; color: #1e293b;"><strong>Time:</strong> ${bookingTime}</p>
          </div>

          <!-- Payment Receipt Section -->
          <div style="background: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1e293b; font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">💳 Payment Receipt</h3>
            <p style="margin: 6px 0; color: #1e293b;"><strong>Description:</strong> ${serviceName}</p>
            <p style="margin: 6px 0; color: #1e293b;"><strong>Amount Paid:</strong> ${price || '₱2,500.00'}</p>
            <p style="margin: 6px 0; color: #1e293b;"><strong>Payment Status:</strong> <span style="color: #059669; font-weight: bold;">Paid Successfully</span></p>
            <p style="margin: 6px 0; color: #1e293b;"><strong>Gateway:</strong> Stripe Secure Checkout</p>
          </div>

          <p style="color: #334155; font-size: 14px;">Click the button below to instantly add this event to your Google Calendar:</p>
          
          <a href="${calendarLink}" target="_blank" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 24px; font-weight: bold; text-decoration: none; border-radius: 8px; margin-top: 10px;">
            📅 Add to Google Calendar
          </a>

          <p style="color: #94a3b8; font-size: 12px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
            If you have any questions or need to reschedule, please reply to this email.
          </p>
        </div>
      `,
    })

    // 2. Send notification email copy to the ADMIN (You)
    if (process.env.ADMIN_EMAIL) {
      await transporter.sendMail({
        from: `"Booking Platform" <${process.env.EMAIL_USER}>`,
        to: process.env.ADMIN_EMAIL,
        subject: `New Paid Booking: ${serviceName} (${userEmail})`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc;">
            <h2 style="color: #059669; margin-top: 0;">New Appointment Booked! 💰</h2>
            <p style="color: #334155; font-size: 16px;">A client has successfully completed payment.</p>
            
            <div style="background: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
              <p style="margin: 6px 0; color: #1e293b;"><strong>Client Email:</strong> ${userEmail}</p>
              <p style="margin: 6px 0; color: #1e293b;"><strong>Service:</strong> ${serviceName}</p>
              <p style="margin: 6px 0; color: #1e293b;"><strong>Date:</strong> ${bookingDate}</p>
              <p style="margin: 6px 0; color: #1e293b;"><strong>Time:</strong> ${bookingTime}</p>
              <p style="margin: 6px 0; color: #1e293b;"><strong>Amount Paid:</strong> ${price || '₱2,500.00'}</p>
            </div>
          </div>
        `,
      })
    }

    console.log('Confirmation emails and receipts sent successfully via Nodemailer.')
  } catch (error) {
    console.error('Nodemailer error:', error)
  }
}