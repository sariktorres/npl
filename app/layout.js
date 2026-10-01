import './globals.css'
import { Providers } from './providers'
import { Toaster } from '@/components/ui/sonner'

export const metadata = {
  title: 'Apex Premier League — Cricket Tournament',
  description: 'The most cinematic cricket tournament experience. Live scores, auctions, teams, players and more.',
  keywords: ['cricket', 'tournament', 'league', 'live score', 'auction', 'APL'],
  openGraph: {
    title: 'Apex Premier League',
    description: 'Where Legends Are Forged — live cricket tournament, auctions and realtime scores.',
    type: 'website',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <script dangerouslySetInnerHTML={{__html:'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);'}} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
        <Toaster position="top-center" theme="dark" richColors />
      </body>
    </html>
  )
}
