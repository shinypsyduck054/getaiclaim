import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ClaimShield — Fight Fraudulent Marketplace Claims',
  description: 'AI-generated dispute responses for Amazon, eBay, and Etsy sellers. Win your claim. Keep your account.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  )
}
