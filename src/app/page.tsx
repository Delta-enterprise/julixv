import JuliPage from '@/components/invitacion/page'
import { env } from '@/env';
import { Metadata } from 'next';
import React from 'react'


export const metadata: Metadata = {
  applicationName: 'JULI FIFTEEN',
  title: 'JULI FIFTEEN - Mis 15 años',
  description: 'Celebración de los 15 años de Julia Ricci en SUMMUM, Las Varillas, Córdoba. Confirma tu asistencia.',
  metadataBase: new URL('https://julixv.com'),
  viewport: 'width=device-width, initial-scale=1.0',
  openGraph: {
    type: 'website',
    title: 'JULI FIFTEEN - Mis 15 años',
    description: 'Celebración de los 15 años de Julia Ricci en SUMMUM, Las Varillas, Córdoba.',
    url: 'https://julixv.com/',
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
const Page = () => {
  const event_id = env.EVENT_ID
  return (
    <JuliPage event_id={event_id} />
  )
}

export default Page