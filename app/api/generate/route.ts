import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import Anthropic from '@anthropic-ai/sdk'

const PLATFORM_LABELS: Record<string, string> = {
  amazon: 'Amazon',
  ebay: 'eBay',
  etsy: 'Etsy',
}

const GUARANTEE_LABELS: Record<string, string> = {
  amazon: 'A-to-Z Guarantee',
  ebay: 'Money Back Guarantee',
  etsy: 'Purchase Protection',
}

const CLAIM_LABELS: Record<string, string> = {
  not_received: 'Item Not Received',
  not_as_described: 'Item Not as Described',
  item_damaged: 'Item Arrived Damaged',
}

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const anthropic = new Anthropic()
  try {
    const { paymentIntentId, platform, claimType, orderId, itemName, trackingNumber, buyerMessage, asin, ebayItemNumber, shopName } = await req.json()

    // Verify payment succeeded before generating
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
    if (pi.status !== 'succeeded') {
      return NextResponse.json({ error: 'Payment not confirmed' }, { status: 402 })
    }

    const platformLabel = PLATFORM_LABELS[platform] ?? platform
    const guaranteeLabel = GUARANTEE_LABELS[platform] ?? ''
    const claimLabel = CLAIM_LABELS[claimType] ?? claimType
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: `You are an expert marketplace seller dispute specialist. You write professional, firm dispute responses that ${platformLabel} reviewers accept. Your letters use precise platform policy language, focus on facts over emotion, and always include account health protection language. You know exactly what evidence each platform needs and in what order to present it.

Never use em dashes (the character —) anywhere in your output. Use commas, colons, or plain hyphens instead.

Respond ONLY with a valid JSON object in this exact shape -- no markdown, no explanation, no preamble:
{"letter":"...","checklist":["...","...","..."]}

The letter should be 300-500 words. The checklist should have 5-7 specific, actionable evidence items.`,
      messages: [
        {
          role: 'user',
          content: `Generate a dispute response letter and evidence checklist for this case:

Platform: ${platformLabel} (${guaranteeLabel})
Claim type: ${claimLabel}
Order ID: ${orderId || 'not provided'}
Item name: ${itemName || 'not provided'}
Tracking number: ${trackingNumber || 'not provided'}
Buyer's claim message: ${buyerMessage || 'not provided'}
${platform === 'amazon' && asin ? `ASIN: ${asin}` : ''}
${platform === 'ebay' && ebayItemNumber ? `eBay Item Number: ${ebayItemNumber}` : ''}
${platform === 'etsy' && shopName ? `Etsy Shop Name: ${shopName}` : ''}
Date: ${today}

The letter must be addressed to the ${platformLabel} Seller Performance Team and reference the specific order and platform guarantee by name. End with a formal resolution request.`,
        },
      ],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''

    let parsed: { letter: string; checklist: string[] }
    try {
      parsed = JSON.parse(raw)
    } catch {
      // If Claude didn't return clean JSON, extract what we can
      const letterMatch = raw.match(/"letter"\s*:\s*"([\s\S]*?)(?<!\\)",/)
      const checklistMatch = raw.match(/"checklist"\s*:\s*\[([\s\S]*?)\]/)
      parsed = {
        letter: letterMatch ? letterMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : raw,
        checklist: checklistMatch
          ? checklistMatch[1].split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean)
          : ['Gather tracking confirmation', 'Screenshot order details', 'Save buyer message thread'],
      }
    }

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('generate error:', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
