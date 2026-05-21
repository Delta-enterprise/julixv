import '@/styles/globals.css';
import './globals.css'
import { Metadata } from 'next';


export const metadata: Metadata = {
  applicationName: 'JULI FIFTEEN',
  title: 'JULI FIFTEEN - Mis 15 años',
  description: 'Celebración de los 15 años de Julia Ricci en SUMMUM, Las Varillas, Córdoba. Confirma tu asistencia.',
  metadataBase: new URL('https://juli-fifteen.vercel.app'),
  viewport: 'width=device-width, initial-scale=1.0',
  openGraph: {
    type: 'website',
    title: 'JULI FIFTEEN - Mis 15 años',
    description: 'Celebración de los 15 años de Julia Ricci en SUMMUM, Las Varillas, Córdoba.',
    url: 'https://juli-fifteen.vercel.app/',
    siteName: 'JULI FIFTEEN',
    images: [
      {
        url: '/link.jpg',
        width: 1200,
        height: 630,
        alt: 'JULI FIFTEEN',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JULI FIFTEEN - Mis 15 años',
    description: 'Celebración de los 15 años de Julia Ricci en SUMMUM, Las Varillas, Córdoba.',
    images: ['/link.jpg'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
     
      <body>
        {children}
      </body>
    </html>
  )
}
 