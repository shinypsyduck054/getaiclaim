import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Fight A Claim: Dispute Fraudulent Marketplace Claims',
  description: 'AI-generated dispute responses for Amazon, eBay, and Etsy sellers. Win your claim. Keep your account.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
