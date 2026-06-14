'use client'

import { useState, useEffect, useRef } from 'react'
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

function FistIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="4.5" y="2" width="3" height="7" rx="1.5" />
      <rect x="8.5" y="1" width="3" height="8" rx="1.5" />
      <rect x="12.5" y="1.5" width="3" height="7.5" rx="1.5" />
      <rect x="16.5" y="3" width="2.5" height="6" rx="1.25" />
      <rect x="4" y="8" width="15" height="12" rx="2" />
      <rect x="1" y="10" width="4.5" height="7" rx="1.5" />
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
              className="w-full bg-[#DC143C] hover:bg-[#b01030] disabled:bg-[#f08090] text-white font-bold py-4 rounded-xl text-lg shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-3"
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
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0"><FistIcon className="w-6 h-6 text-[#DC143C]" /></div>
              <div>
                <div className="font-semibold text-gray-900 text-sm">Fight A Claim</div>
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
      <div className="min-h-screen bg-white">
        <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#DC143C] rounded-lg flex items-center justify-center"><FistIcon className="w-4 h-4 text-white" /></div>
              <span className="font-bold text-gray-900 text-lg">Fight A Claim</span>
            </div>
            <button onClick={() => setStep('form')} className="bg-[#DC143C] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#b01030] transition-colors">
              Fight a Claim
            </button>
          </div>
        </header>

        <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-1.5 rounded-full mb-8 font-medium">
            <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
            Instant delivery · $19 one-time · No subscription
          </div>
          <h1 className="text-5xl font-extrabold text-gray-900 leading-tight mb-6">
            Stop losing money to<br />
            <span className="text-[#DC143C]">fraudulent buyer claims.</span>
          </h1>
          <p className="text-xl text-gray-600 mb-4 max-w-2xl mx-auto">
            Get a professionally written dispute response for Amazon, eBay, or Etsy in 2 minutes -- the kind platforms actually accept.
          </p>
          <p className="text-base text-gray-500 mb-10 max-w-xl mx-auto">
            Every wrongly-conceded claim counts against your Order Defect Rate. Even a $30 dispute is worth fighting when your account health is on the line.
          </p>
          <button
            onClick={() => setStep('form')}
            className="bg-[#DC143C] hover:bg-[#b01030] text-white text-lg font-bold px-10 py-4 rounded-xl shadow-lg shadow-red-200 transition-all hover:shadow-xl hover:scale-105 active:scale-100"
          >
            Generate My Response for $19
          </button>
          <p className="text-sm text-gray-400 mt-3">Instant delivery · No subscription · Works on all 3 platforms</p>
        </section>

        <section className="max-w-3xl mx-auto px-6 pb-16">
          <div className="grid grid-cols-3 gap-4">
            {(Object.entries(PLATFORMS) as [Platform, typeof PLATFORMS[Platform]][]).map(([key, p]) => (
              <div key={key} className={`border-2 rounded-xl p-4 text-center ${p.color}`}>
                <div className="font-bold text-lg">{p.label}</div>
                <div className="text-sm opacity-75">{p.sub}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-gray-50 border-t border-gray-200 py-16">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">What you get for $19</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { title: 'Platform-optimized dispute letter', desc: 'Written in the exact language Amazon/eBay/Etsy reviewers look for. Structured for how each platform actually evaluates claims.' },
                { title: 'Evidence submission checklist', desc: 'Exactly what to attach, in what order, with platform-specific instructions. Submitting the right evidence is half the battle.' },
                { title: 'Account health protection language', desc: 'Your response creates a formal record you contested this claim. Critical if Amazon denies the first appeal -- this is your escalation foundation.' },
                { title: 'Personalized to your situation', desc: 'Your order ID, tracking number, and claim details are woven into the response. Not a fill-in-the-blank form -- a real dispute letter.' },
              ].map((item) => (
                <div key={item.title} className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-green-600 text-xs font-bold">✓</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">{item.title}</div>
                      <div className="text-sm text-gray-600">{item.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <div className="grid grid-cols-3 gap-8">
              {[
                { stat: '$19', label: 'One-time. No subscription.' },
                { stat: '~90s', label: 'Average generation time' },
                { stat: '3', label: 'Platforms supported' },
              ].map((s) => (
                <div key={s.stat}>
                  <div className="text-3xl font-bold text-[#DC143C]">{s.stat}</div>
                  <div className="text-sm text-gray-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#DC143C] py-16 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to fight back?</h2>
          <p className="text-red-200 mb-8 text-lg">It takes 2 minutes. Your documents are ready before the page reloads.</p>
          <button onClick={() => setStep('form')} className="bg-white text-[#DC143C] font-bold text-lg px-10 py-4 rounded-xl hover:bg-red-50 transition-colors shadow-lg">
            Generate My Response for $19
          </button>
        </section>

        <footer className="border-t border-gray-200 bg-white py-8">
          <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-400">
            <span>© {new Date().getFullYear()} Fight A Claim · All rights reserved</span>
            <a href="mailto:support@fightaclaim.com" className="hover:text-gray-600 transition-colors">support@fightaclaim.com</a>
          </div>
        </footer>
      </div>
    )
  }

  // ---- Form ----
  if (step === 'form') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
            <button onClick={() => setStep('landing')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <span>←</span>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-[#DC143C] rounded flex items-center justify-center"><FistIcon className="w-3.5 h-3.5 text-white" /></div>
                <span className="font-semibold">Fight A Claim</span>
              </div>
            </button>
            <div className="text-sm text-gray-500">Step 1 of 2: Claim details</div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-6 py-10">
          {generateError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-6">{generateError}</div>
          )}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Tell us about your claim</h1>
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
                      className={`w-full text-left border-2 rounded-xl px-4 py-3 transition-all ${form.claimType === key ? 'border-[#DC143C] bg-red-50 text-red-900 font-semibold' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}
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
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:border-transparent"
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
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:border-transparent"
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
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:border-transparent"
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
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:border-transparent"
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
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:border-transparent"
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
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:border-transparent"
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
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#DC143C] resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Your email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:border-transparent"
              />
            </div>

            <button
              onClick={() => setStep('payment')}
              className="w-full bg-[#DC143C] hover:bg-[#b01030] text-white font-bold py-4 rounded-xl text-lg shadow-lg shadow-red-200 transition-all hover:shadow-xl"
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
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <button onClick={() => setStep('form')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <span>←</span>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-[#DC143C] rounded flex items-center justify-center"><FistIcon className="w-3.5 h-3.5 text-white" /></div>
                <span className="font-semibold">Fight A Claim</span>
              </div>
            </button>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="text-green-600">🔒</span>
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
                variables: { colorPrimary: '#DC143C', borderRadius: '12px' },
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
            <div className="w-8 h-8 border-2 border-[#DC143C] border-t-transparent rounded-full animate-spin" />
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
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <div className="w-8 h-8 bg-[#DC143C] rounded-lg flex items-center justify-center"><FistIcon className="w-4 h-4 text-white" /></div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Generating your documents</h2>
            <p className="text-gray-500 text-sm mb-8">Analyzing platform policies and drafting your response...</p>
            <div className="space-y-3 text-left">
              {PROCESSING_STEPS.map((s, i) => (
                <div key={s} className={`flex items-center gap-3 text-sm transition-all duration-300 ${i < processingStep ? 'text-green-600' : i === processingStep ? 'text-gray-900' : 'text-gray-300'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${i < processingStep ? 'bg-green-100 text-green-600' : i === processingStep ? 'bg-red-100 text-[#DC143C] animate-pulse' : 'bg-gray-100 text-gray-300'}`}>
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
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
              <span className="font-semibold text-gray-900">Your documents are ready</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                {copied ? '✓ Copied!' : 'Copy text'}
              </button>
              <button
                onClick={() => window.print()}
                className="bg-[#DC143C] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#b01030] transition-colors"
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
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeDoc === 'letter' ? 'bg-white border-2 border-[#DC143C] text-[#DC143C] shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}
            >
              Document 1: Dispute Response
            </button>
            <button
              onClick={() => setActiveDoc('checklist')}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeDoc === 'checklist' ? 'bg-white border-2 border-[#DC143C] text-[#DC143C] shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}
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
                      <input type="checkbox" className="mt-0.5 w-4 h-4 rounded text-[#DC143C] flex-shrink-0" />
                      <span className="text-sm text-gray-800">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 bg-red-50 border border-red-200 rounded-2xl p-6">
            <h3 className="font-bold text-red-900 mb-3">What to do next</h3>
            <ol className="space-y-2 text-sm text-red-900">
              <li className="flex gap-2"><span className="font-bold flex-shrink-0">1.</span> Gather the evidence items from the checklist above</li>
              <li className="flex gap-2"><span className="font-bold flex-shrink-0">2.</span> Open {PLATFORMS[form.platform].label} Seller Central → Claims → locate this claim</li>
              <li className="flex gap-2"><span className="font-bold flex-shrink-0">3.</span> Paste the dispute response letter into the response field</li>
              <li className="flex gap-2"><span className="font-bold flex-shrink-0">4.</span> Attach evidence files (tracking screenshot first)</li>
              <li className="flex gap-2"><span className="font-bold flex-shrink-0">5.</span> Submit and wait 48 to 72 hours for review</li>
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
              className="text-[#DC143C] hover:text-[#b01030] text-sm font-medium"
            >
              ← Fight another claim
            </button>
          </div>
        </main>
        <footer className="border-t border-gray-200 bg-white py-6 mt-8">
          <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-400">
            <span>© {new Date().getFullYear()} Fight A Claim · All rights reserved</span>
            <a href="mailto:support@fightaclaim.com" className="hover:text-gray-600 transition-colors">support@fightaclaim.com</a>
          </div>
        </footer>
      </div>
    )
  }

  return null
}
