
import { Providers } from '@/components/providers';
import './globals.css'

export const metadata = {
  title: 'Cuidar.me',
  description: 'Plataforma de acompanhamento de pacientes.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
