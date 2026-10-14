import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key')

export async function POST(req: Request) {
  try {
// inside src/app/api/checkout/route.ts
const { serviceName, bookingDate, bookingTime, price } = await req.json()

    // Create Stripe Checkout Session (Dynamic Payment Methods)
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
  success_url: `${req.headers.get('origin')}/dashboard?success=true&service=${encodeURIComponent(serviceName)}&date=${encodeURIComponent(bookingDate)}&time=${encodeURIComponent(bookingTime)}`,
  cancel_url: `${req.headers.get('origin')}/dashboard?canceled=true`,
})

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}


