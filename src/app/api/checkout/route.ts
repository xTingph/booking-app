import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key')

export async function POST(req: Request) {
  try {
    const { serviceName, bookingDate, bookingTime } = await req.json()

    // Create Stripe Checkout Session (Dynamic Payment Methods)
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: serviceName,
              description: `Appointment on ${bookingDate} at ${bookingTime}`,
            },
            unit_amount: 5000, // $50.00 USD
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/dashboard?success=true&service=${encodeURIComponent(serviceName)}&date=${encodeURIComponent(bookingDate)}&time=${encodeURIComponent(bookingTime)}`,
      cancel_url: `${req.headers.get('origin')}/dashboard?canceled=true`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}