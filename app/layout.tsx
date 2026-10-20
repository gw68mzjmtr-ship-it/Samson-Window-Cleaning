import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Samson | Professional Window Cleaning', description: 'Exterior window cleaning for storefronts, HOAs, commercial properties and select homes. Transparent pricing and recurring maintenance.' };
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>}
