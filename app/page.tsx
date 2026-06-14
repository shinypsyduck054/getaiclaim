'use client'

import React, { useState, useEffect, useRef } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

type Step = 'landing' | 'form' | 'payment' | 'processing' | 'result'
type Platform = 'amazon' | 'ebay' | 'etsy'
type ClaimType = 'not_received' | 'not_as_described' | 'item_damaged'

interface FormData {
  platform: Platform
  claimType: ClaimType
  orderId: string
  itemName: string
  trackingNumber: string
  buyerMessage: string
  asin: string
  ebayItemNumber: string
  shopName: string
}

const PLATFORMS = {
  amazon: { label: 'Amazon', sub: 'A-to-Z Guarantee', color: 'bg-orange-50 border-orange-300 text-orange-800', selectedColor: 'border-orange-500 bg-orange-50 text-orange-900' },
  ebay: { label: 'eBay', sub: 'Money Back Guarantee', color: 'bg-blue-50 border-blue-300 text-blue-800', selectedColor: 'border-blue-500 bg-blue-50 text-blue-900' },
  etsy: { label: 'Etsy', sub: 'Purchase Protection', color: 'bg-orange-50 border-amber-300 text-amber-800', selectedColor: 'border-[#F1641E] bg-orange-50 text-orange-900' },
}

const CLAIM_TYPES = {
  not_received: 'Item Not Received',
  not_as_described: 'Item Not as Described',
  item_damaged: 'Item Arrived Damaged',
}

const HERO_WORDS = ['Amazon', 'eBay', 'Etsy']

function ShieldIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} xmlns="http://www.w3.org/2000/svg" fill="none">
      <path
        d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V6L12 2z"
        fill="currentColor"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <line x1="8" y1="9.5" x2="16" y2="9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M8.5 14.5l2 2 3.5-3.5" stroke="#FF5A3D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const PROCESSING_STEPS = [
  'Verifying payment...',
  'Analyzing your claim details...',
  'Checking platform policies...',
  'Identifying strongest defenses...',
  'Drafting dispute response...',
  'Building evidence checklist...',
]

// ----- Payment sub-component (needs Stripe context) -----

interface PaymentFormProps {
  email: string
  clientSecret: string
  form: FormData
  onSuccess: (paymentIntentId: string) => void
}

function PaymentFormInner({ email, clientSecret, form, onSuccess }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const platformLabel = PLATFORMS[form.platform].label
  const claimLabel = CLAIM_TYPES[form.claimType]

  const handlePay = async () => {
    if (!stripe || !elements) return
    setError('')
    setLoading(true)

    const { error: submitErr } = await elements.submit()
    if (submitErr) {
      setError(submitErr.message ?? 'Payment error')
      setLoading(false)
      return
    }

    const { error: confirmErr, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: { payment_method_data: { billing_details: { email } } },
    })

    if (confirmErr) {
      setError(confirmErr.message ?? 'Payment failed')
      setLoading(false)
      return
    }

    if (paymentIntent?.status === 'succeeded') {
      onSuccess(paymentIntent.id)
    } else {
      setError('Payment did not complete. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        {/* Payment form */}
        <div className="md:col-span-3">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Payment details</h1>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-5">
            <PaymentElement
              options={{
                layout: 'tabs',
                defaultValues: { billingDetails: { email } },
              }}
            />
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
            )}
            <button
              onClick={handlePay}
              disabled={loading || !stripe}
              className="w-full bg-[#FF5A3D] hover:bg-[#d94020] disabled:bg-[#ffb3a5] text-white font-bold py-4 rounded-xl text-lg shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <><span>🔒</span> Pay $19.00</>
              )}
            </button>
            <div className="flex items-center justify-center gap-2 pt-1">
              <span className="text-gray-300 text-xs">Secured by</span>
              <div className="w-10 h-4 bg-[#635bff] rounded-sm flex items-center justify-center">
                <span className="text-white text-[8px] font-bold tracking-wider">stripe</span>
              </div>
            </div>
          </div>
        </div>

        {/* Order summary */}
        <div className="md:col-span-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Order summary</h2>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-start gap-4 mb-6 pb-6 border-b border-gray-100">
              <ShieldIcon className="w-9 h-9 text-[#0D1B2A] flex-shrink-0" />
              <div>
                <div className="font-semibold text-gray-900 text-sm">
                  Fight <span className="text-[#FF5A3D]">A</span> Claim
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{platformLabel} · {claimLabel}</div>
                {form.itemName && <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[160px]">{form.itemName}</div>}
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-600"><span>Dispute response letter</span><span>$19.00</span></div>
              <div className="flex justify-between text-gray-600"><span>Evidence checklist</span><span className="text-green-600 font-medium">Free</span></div>
              <div className="flex justify-between text-gray-600"><span>Account health language</span><span className="text-green-600 font-medium">Free</span></div>
              <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-gray-900 text-base"><span>Total</span><span>$19.00</span></div>
            </div>
            <div className="mt-6 space-y-2.5">
              {[
                { icon: '⚡', text: 'Documents ready in ~90 seconds' },
                { icon: '🔒', text: '256-bit SSL encryption' },
                { icon: '✓', text: '100% satisfaction guarantee' },
              ].map(item => (
                <div key={item.text} className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{item.icon}</span><span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ----- Main page -----

export default function Home() {
  const [step, setStep] = useState<Step>('landing')
  const [processingStep, setProcessingStep] = useState(0)
  const [form, setForm] = useState<FormData>({
    platform: 'amazon',
    claimType: 'not_received',
    orderId: '',
    itemName: '',
    trackingNumber: '',
    buyerMessage: '',
    asin: '',
    ebayItemNumber: '',
    shopName: '',
  })
  const [result, setResult] = useState<{ letter: string; checklist: string[] } | null>(null)
  const [activeDoc, setActiveDoc] = useState<'letter' | 'checklist'>('letter')
  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState('')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
  const [generateError, setGenerateError] = useState('')
  const generateCalled = useRef(false)

  // Hero word animation
  const [heroWordIdx, setHeroWordIdx] = useState(0)
  const [heroFade, setHeroFade] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroFade(false)
      setTimeout(() => {
        setHeroWordIdx(i => (i + 1) % HERO_WORDS.length)
        setHeroFade(true)
      }, 300)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  // Fetch PaymentIntent when entering payment step
  useEffect(() => {
    if (step !== 'payment') return
    setClientSecret(null)
    fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
      .then(r => r.json())
      .then(data => setClientSecret(data.clientSecret))
      .catch(err => console.error('Failed to create payment intent:', err))
  }, [step, email])

  // Run generate after payment succeeds
  useEffect(() => {
    if (step !== 'processing' || !paymentIntentId || generateCalled.current) return
    generateCalled.current = true

    let animStep = 0
    const advance = () => {
      animStep++
      setProcessingStep(animStep)
    }
    const timers: ReturnType<typeof setTimeout>[] = []
    for (let i = 0; i < PROCESSING_STEPS.length - 1; i++) {
      timers.push(setTimeout(advance, 700 + i * 600))
    }

    fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentIntentId, ...form }),
    })
      .then(r => r.json())
      .then(data => {
        timers.forEach(clearTimeout)
        if (data.error) {
          setGenerateError(data.error)
          setStep('form')
          return
        }
        setProcessingStep(PROCESSING_STEPS.length)
        setTimeout(() => {
          setResult(data)
          setStep('result')
        }, 400)
      })
      .catch(() => {
        timers.forEach(clearTimeout)
        setGenerateError('Something went wrong generating your documents. Please contact support.')
        setStep('form')
      })
  }, [step, paymentIntentId, form])

  const handlePaid = (piId: string) => {
    generateCalled.current = false
    setPaymentIntentId(piId)
    setProcessingStep(0)
    setStep('processing')
  }

  const handleCopy = () => {
    if (!result) return
    navigator.clipboard.writeText(activeDoc === 'letter' ? result.letter : result.checklist.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ---- Landing ----
  if (step === 'landing') {
    return (
      <div>
        {/* Nav */}
        <header style={{ backgroundColor: '#0D1B2A' }} className="sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldIcon className="w-7 h-7 text-white" />
              <span className="font-bold text-white text-lg">
                Fight <span className="text-[#FF5A3D]">A</span> Claim
              </span>
            </div>
            <button
              onClick={() => setStep('form')}
              className="bg-[#FF5A3D] hover:bg-[#d94020] text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              Fight a Claim
            </button>
          </div>
        </header>

        {/* Hero */}
        <section style={{ backgroundColor: '#0D1B2A' }} className="px-6 pt-12 md:pt-24 pb-16 md:pb-20 text-center">
          <p className="text-[#53627A] text-xs font-semibold tracking-widest uppercase mb-8">
            PROTECT SELLERS. DEFEND EVERY CLAIM.
          </p>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-[1.1] mb-6">
            Evidence-based defense for every{' '}
            <span className="relative inline-block text-[#FF5A3D]">
              {/* Invisible spacer holds the width of the longest word */}
              <span className="invisible" aria-hidden="true">Amazon</span>
              <span
                className="absolute inset-0 text-center transition-opacity duration-300"
                style={{ opacity: heroFade ? 1 : 0 }}
              >
                {HERO_WORDS[heroWordIdx]}
              </span>
            </span>
            {' '}claim.
          </h1>
          <p className="text-lg text-[#E6E9EE] mb-3 max-w-2xl mx-auto opacity-80">
            Get a professionally written dispute response and evidence checklist in 2 minutes -- the kind platforms actually accept.
          </p>
          <p className="text-sm text-[#53627A] mb-10 max-w-xl mx-auto">
            Every wrongly-conceded claim counts against your Order Defect Rate. Even a $30 dispute is worth fighting when your account health is on the line.
          </p>
          <button
            onClick={() => setStep('form')}
            className="bg-[#FF5A3D] hover:bg-[#d94020] text-white text-lg font-bold px-10 py-4 rounded-xl shadow-lg transition-all hover:shadow-xl hover:scale-105 active:scale-100"
          >
            Get My Defense Kit for $19
          </button>
          <p className="text-sm text-[#53627A] mt-3">Instant delivery · No subscription · Amazon, eBay, and Etsy</p>
        </section>

        {/* Platform trust strip */}
        <section style={{ backgroundColor: '#1E2A3A' }} className="py-10 px-6">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-semibold tracking-widest uppercase text-center mb-6" style={{ color: '#53627A' }}>Supported platforms</p>
            <div className="grid grid-cols-3 gap-4">
              {(Object.entries(PLATFORMS) as [Platform, typeof PLATFORMS[Platform]][]).map(([key, p]) => (
                <div key={key} className="rounded-xl p-4 text-center" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div className="font-bold text-white text-lg">{p.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#53627A' }}>{p.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What you get */}
        <section className="bg-[#F8F9FB] border-t border-gray-200 py-16">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-[#0D1B2A] text-center mb-2">What you get for $19</h2>
            <p className="text-center text-gray-500 text-sm mb-10">Two documents, ready in under 2 minutes.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { title: 'Platform-optimized dispute letter', desc: 'Written in the exact language Amazon/eBay/Etsy reviewers look for. Structured for how each platform actually evaluates claims.' },
                { title: 'Evidence submission checklist', desc: 'Exactly what to attach, in what order, with platform-specific instructions. Submitting the right evidence is half the battle.' },
                { title: 'Account health protection language', desc: 'Your response creates a formal record you contested this claim. Critical if Amazon denies the first appeal -- this is your escalation foundation.' },
                { title: 'Personalized to your situation', desc: 'Your order ID, tracking number, and claim details are woven into the response. Not a fill-in-the-blank form -- a real dispute letter.' },
              ].map((item) => (
                <div key={item.title} className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#FF5A3D]/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5 text-[#FF5A3D]" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-[#0D1B2A] mb-1">{item.title}</div>
                      <div className="text-sm text-gray-600">{item.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-14 bg-white border-t border-gray-100">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <div className="grid grid-cols-3 gap-8">
              {[
                { stat: '$19', label: 'One-time. No subscription.' },
                { stat: '~90s', label: 'Average generation time' },
                { stat: '3', label: 'Platforms supported' },
              ].map((s) => (
                <div key={s.stat}>
                  <div className="text-3xl font-bold text-[#FF5A3D]">{s.stat}</div>
                  <div className="text-sm text-gray-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section style={{ backgroundColor: '#FF5A3D' }} className="py-16 text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Ready to fight back?</h2>
          <p className="mb-8 text-lg" style={{ color: 'rgba(255,255,255,0.8)' }}>It takes 2 minutes. Your documents are ready before the page reloads.</p>
          <button
            onClick={() => setStep('form')}
            className="bg-white font-bold text-lg px-10 py-4 rounded-xl hover:bg-orange-50 transition-colors shadow-lg"
            style={{ color: '#FF5A3D' }}
          >
            Get My Defense Kit for $19
          </button>
        </section>

        {/* Footer */}
        <footer style={{ backgroundColor: '#0D1B2A' }} className="py-8">
          <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm" style={{ color: '#53627A' }}>
            <div className="flex items-center gap-2">
              <ShieldIcon className="w-4 h-4" style={{ color: '#53627A' } as React.CSSProperties} />
              <span>© {new Date().getFullYear()} Fight A Claim · All rights reserved</span>
            </div>
            <a href="mailto:support@fightaclaim.com" className="hover:text-white transition-colors">support@fightaclaim.com</a>
          </div>
        </footer>
      </div>
    )
  }

  // ---- Form ----
  if (step === 'form') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header style={{ backgroundColor: '#0D1B2A' }}>
          <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
            <button onClick={() => setStep('landing')} className="flex items-center gap-2 group">
              <span className="group-hover:text-white transition-colors text-sm" style={{ color: '#53627A' }}>←</span>
              <ShieldIcon className="w-5 h-5 text-white" />
              <span className="font-semibold text-white">
                Fight <span style={{ color: '#FF5A3D' }}>A</span> Claim
              </span>
            </button>
            <div className="text-sm" style={{ color: '#53627A' }}>Step 1 of 2: Claim details</div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-6 py-10">
          {generateError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-6">{generateError}</div>
          )}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#0D1B2A] mb-2">Tell us about your claim</h1>
            <p className="text-gray-600">We'll generate a platform-specific dispute response tailored to your situation.</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Which platform?</label>
              <div className="grid grid-cols-3 gap-3">
                {(Object.entries(PLATFORMS) as [Platform, typeof PLATFORMS[Platform]][]).map(([key, p]) => (
                  <button
                    key={key}
                    onClick={() => setForm(f => ({ ...f, platform: key }))}
                    className={`border-2 rounded-xl p-3 text-center transition-all ${form.platform === key ? p.selectedColor : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}
                  >
                    <div className="font-bold">{p.label}</div>
                    <div className="text-xs opacity-70 mt-0.5">{p.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">What type of claim?</label>
              <div className="space-y-2">
                {(Object.entries(CLAIM_TYPES) as [ClaimType, string][]).map(([key, label]) => {
                  const displayLabel = form.platform === 'ebay' && key === 'not_as_described'
                    ? 'Significantly Not as Described (SNAD)'
                    : label
                  return (
                    <button
                      key={key}
                      onClick={() => setForm(f => ({ ...f, claimType: key }))}
                      className={`w-full text-left border-2 rounded-xl px-4 py-3 transition-all ${form.claimType === key ? 'border-[#FF5A3D] bg-orange-50 text-orange-900 font-semibold' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}
                    >
                      {displayLabel}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Order ID <span className="text-gray-400 font-normal">(optional but recommended)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 112-3456789-0123456"
                value={form.orderId}
                onChange={e => setForm(f => ({ ...f, orderId: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A3D] focus:border-transparent"
              />
            </div>

            {form.platform === 'amazon' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ASIN <span className="text-gray-400 font-normal">(optional -- strengthens your case)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. B08N5WRWNW"
                  value={form.asin}
                  onChange={e => setForm(f => ({ ...f, asin: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A3D] focus:border-transparent"
                />
              </div>
            )}

            {form.platform === 'ebay' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  eBay Item Number <span className="text-gray-400 font-normal">(12-digit listing number, optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 123456789012"
                  value={form.ebayItemNumber}
                  onChange={e => setForm(f => ({ ...f, ebayItemNumber: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A3D] focus:border-transparent"
                />
              </div>
            )}

            {form.platform === 'etsy' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Your Etsy shop name <span className="text-gray-400 font-normal">(used in the response header)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. VintageTreasuresShop"
                  value={form.shopName}
                  onChange={e => setForm(f => ({ ...f, shopName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A3D] focus:border-transparent"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Item name</label>
              <input
                type="text"
                placeholder="e.g. Wireless Bluetooth Headphones"
                value={form.itemName}
                onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A3D] focus:border-transparent"
              />
            </div>

            {form.claimType !== 'not_as_described' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tracking number <span className="text-gray-400 font-normal">(if applicable)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1Z999AA10123456784"
                  value={form.trackingNumber}
                  onChange={e => setForm(f => ({ ...f, trackingNumber: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A3D] focus:border-transparent"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                What did the buyer say? <span className="text-gray-400 font-normal">(paste their claim message)</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Item never arrived, tracking says delivered but I checked everywhere and nothing was here"
                value={form.buyerMessage}
                onChange={e => setForm(f => ({ ...f, buyerMessage: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A3D] resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Your email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A3D] focus:border-transparent"
              />
            </div>

            <button
              onClick={() => setStep('payment')}
              className="w-full bg-[#FF5A3D] hover:bg-[#d94020] text-white font-bold py-4 rounded-xl text-lg shadow-lg shadow-orange-200 transition-all hover:shadow-xl"
            >
              Continue to Payment $19
            </button>
            <p className="text-center text-xs text-gray-400">Secure payment via Stripe · Documents ready in ~90 seconds</p>
          </div>
        </main>
      </div>
    )
  }

  // ---- Payment ----
  if (step === 'payment') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header style={{ backgroundColor: '#0D1B2A' }}>
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <button onClick={() => setStep('form')} className="flex items-center gap-2 group">
              <span className="group-hover:text-white transition-colors text-sm" style={{ color: '#53627A' }}>←</span>
              <ShieldIcon className="w-5 h-5 text-white" />
              <span className="font-semibold text-white">
                Fight <span style={{ color: '#FF5A3D' }}>A</span> Claim
              </span>
            </button>
            <div className="flex items-center gap-2 text-sm" style={{ color: '#53627A' }}>
              <span>🔒</span>
              <span>Secure checkout · Powered by Stripe</span>
            </div>
          </div>
        </header>

        {clientSecret ? (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: { colorPrimary: '#FF5A3D', borderRadius: '12px' },
              },
            }}
          >
            <PaymentFormInner
              email={email}
              clientSecret={clientSecret}
              form={form}
              onSuccess={handlePaid}
            />
          </Elements>
        ) : (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-8 h-8 border-2 border-[#FF5A3D] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    )
  }

  // ---- Processing ----
  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto px-6 text-center">
          <div className="bg-white rounded-2xl border border-gray-200 p-10 shadow-sm">
            <div className="w-16 h-16 bg-[#FF5A3D]/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <ShieldIcon className="w-9 h-9 text-[#0D1B2A]" />
            </div>
            <h2 className="text-xl font-bold text-[#0D1B2A] mb-2">Generating your documents</h2>
            <p className="text-gray-500 text-sm mb-8">Analyzing platform policies and drafting your response...</p>
            <div className="space-y-3 text-left">
              {PROCESSING_STEPS.map((s, i) => (
                <div key={s} className={`flex items-center gap-3 text-sm transition-all duration-300 ${i < processingStep ? 'text-green-600' : i === processingStep ? 'text-gray-900' : 'text-gray-300'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${i < processingStep ? 'bg-green-100 text-green-600' : i === processingStep ? 'bg-[#FF5A3D]/10 text-[#FF5A3D] animate-pulse' : 'bg-gray-100 text-gray-300'}`}>
                    {i < processingStep ? '✓' : i === processingStep ? '⟳' : '○'}
                  </div>
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ---- Result ----
  if (step === 'result' && result) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header style={{ backgroundColor: '#0D1B2A' }} className="sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
              <span className="font-semibold text-white">Your documents are ready</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ border: '1px solid #53627A', color: '#E6E9EE' }}
              >
                {copied ? '✓ Copied!' : 'Copy text'}
              </button>
              <button
                onClick={() => window.print()}
                className="bg-[#FF5A3D] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#d94020] transition-colors"
              >
                Print / Save PDF
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-8">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-8 flex items-start gap-4">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 text-green-600 text-xl">✓</div>
            <div>
              <div className="font-bold text-green-900 text-lg">2 documents generated</div>
              <div className="text-green-700 text-sm mt-1">
                Your {PLATFORMS[form.platform].label} {CLAIM_TYPES[form.claimType].toLowerCase()} dispute response and evidence checklist are ready. Copy the letter and paste it directly into your platform's dispute response field.
              </div>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveDoc('letter')}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeDoc === 'letter' ? 'bg-white border-2 border-[#FF5A3D] text-[#FF5A3D] shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}
            >
              Document 1: Dispute Response
            </button>
            <button
              onClick={() => setActiveDoc('checklist')}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeDoc === 'checklist' ? 'bg-white border-2 border-[#FF5A3D] text-[#FF5A3D] shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}
            >
              Document 2: Evidence Checklist
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="font-semibold">{PLATFORMS[form.platform].label}</span>
                <span>·</span>
                <span>{CLAIM_TYPES[form.claimType]}</span>
                {form.orderId && <><span>·</span><span>Order #{form.orderId}</span></>}
              </div>
              <div className="text-xs text-gray-400">{new Date().toLocaleDateString()}</div>
            </div>

            {activeDoc === 'letter' ? (
              <pre className="p-8 text-sm text-gray-800 font-mono leading-relaxed whitespace-pre-wrap overflow-auto max-h-[600px]">
                {result.letter}
              </pre>
            ) : (
              <div className="p-8">
                <h3 className="font-bold text-gray-900 text-lg mb-2">Evidence Checklist</h3>
                <p className="text-sm text-gray-500 mb-6">Submit these with your dispute response for the strongest possible case.</p>
                <div className="space-y-3">
                  {result.checklist.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                      <input type="checkbox" className="mt-0.5 w-4 h-4 rounded text-[#FF5A3D] flex-shrink-0" />
                      <span className="text-sm text-gray-800">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 bg-[#FFF5F3] border border-[#FF5A3D]/20 rounded-2xl p-6">
            <h3 className="font-bold text-[#0D1B2A] mb-3">What to do next</h3>
            <ol className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2"><span className="font-bold flex-shrink-0 text-[#FF5A3D]">1.</span> Gather the evidence items from the checklist above</li>
              <li className="flex gap-2"><span className="font-bold flex-shrink-0 text-[#FF5A3D]">2.</span> Open {PLATFORMS[form.platform].label} Seller Central - Claims - locate this claim</li>
              <li className="flex gap-2"><span className="font-bold flex-shrink-0 text-[#FF5A3D]">3.</span> Paste the dispute response letter into the response field</li>
              <li className="flex gap-2"><span className="font-bold flex-shrink-0 text-[#FF5A3D]">4.</span> Attach evidence files (tracking screenshot first)</li>
              <li className="flex gap-2"><span className="font-bold flex-shrink-0 text-[#FF5A3D]">5.</span> Submit and wait 48 to 72 hours for review</li>
            </ol>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setStep('form')
                setResult(null)
                setPaymentIntentId(null)
                generateCalled.current = false
                setForm({ platform: 'amazon', claimType: 'not_received', orderId: '', itemName: '', trackingNumber: '', buyerMessage: '', asin: '', ebayItemNumber: '', shopName: '' })
              }}
              className="text-[#FF5A3D] hover:text-[#d94020] text-sm font-medium"
            >
              ← Fight another claim
            </button>
          </div>
        </main>

        <footer style={{ backgroundColor: '#0D1B2A' }} className="py-6 mt-8">
          <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm" style={{ color: '#53627A' }}>
            <span>© {new Date().getFullYear()} Fight A Claim · All rights reserved</span>
            <a href="mailto:support@fightaclaim.com" className="hover:text-white transition-colors">support@fightaclaim.com</a>
          </div>
        </footer>
      </div>
    )
  }

  return null
}
