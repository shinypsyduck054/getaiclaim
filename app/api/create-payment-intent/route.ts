import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  try {
    const { email } = await req.json()

    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1900,
      currency: 'usd',
      receipt_email: email || undefined,
      metadata: { product: 'claimshield' },
    })

    return NextResponse.json({ clientSecret: paymentIntent.client_secret })
  } catch (err) {
    console.error('create-payment-intent error:', err)
    return NextResponse.json({ error: 'Failed to create payment intent' }, { status: 500 })
  }
}
