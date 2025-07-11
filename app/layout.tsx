import './globals.css'

export const metadata = {
  title: 'PumpFight - Where Sports Stars Launch Their Legacy Tokens',
  description: 'The premier token launchpad for verified combat sports athletes on Chiliz Chain. Trade fighter tokens, back your champions.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div id="root">
          {children}
        </div>
      </body>
    </html>
  )
}