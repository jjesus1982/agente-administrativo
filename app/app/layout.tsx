export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <title>Simple App</title>
      </head>
      <body suppressHydrationWarning={true}>
        <h1>Hello again</h1>
      </body>
    </html>
  )
}