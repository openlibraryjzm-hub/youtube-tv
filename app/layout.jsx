import './globals.css'

export const metadata = {
  title: 'YouTube TV Grok444',
  description: 'A TV-like YouTube playlist player',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* jQuery CDN */}
        <script src="https://code.jquery.com/jquery-3.6.0.min.js" async></script>
        {/* jQuery UI CDN (includes Sortable) */}
        <script src="https://code.jquery.com/ui/1.13.2/jquery-ui.min.js" async></script>
      </head>
      <body>{children}</body>
    </html>
  )
}