import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Samson | Window Cleaning Subscriptions', description: 'Window cleaning subscriptions for homes and storefronts in Charlotte, Concord and Lake Norman. Predictable cleaning schedules, optional interiors and custom commercial assessments.' };
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>}
