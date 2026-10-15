import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key')

export async function POST(req: Request) {
  try {
    const { serviceName, bookingDate, bookingTime, price } = await req.json()

    // Fallback baseUrl if NEXT_PUBLIC_SITE_URL is missing
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || req.headers.get('origin') || 'http://localhost:3000'

    // Create Stripe Checkout Session with dynamic price and success redirect
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: 'php',
            product_data: {
              name: serviceName,
              description: `Appointment on ${bookingDate} at ${bookingTime}`,
            },
            unit_amount: Math.round((price || 2500) * 100), // Convert PHP to centavos
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/dashboard?success=true&service=${encodeURIComponent(serviceName)}&date=${bookingDate}&time=${encodeURIComponent(bookingTime)}&price=${encodeURIComponent(price || 2500)}`,
      cancel_url: `${baseUrl}/dashboard?canceled=true`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}