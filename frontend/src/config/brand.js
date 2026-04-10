const isDemo = import.meta.env.VITE_DEMO_MODE === 'true'

export const isDemoMode = isDemo
export const BRAND = isDemo ? {
  name: import.meta.env.VITE_DEMO_BRAND_NAME
    || 'PropertyPulse',
  tagline: import.meta.env.VITE_DEMO_TAGLINE
    || 'Your Property Journey, Simplified',
  primary: import.meta.env.VITE_DEMO_PRIMARY
    || '#6C3FC5',
  dark: import.meta.env.VITE_DEMO_DARK
    || '#1A1A2E',
  accent: import.meta.env.VITE_DEMO_ACCENT
    || '#F5A623',
} : {
  name: 'Buyers Match',
  tagline: "Australia's Leading Buyer's Agency",
  primary: '#2ABFBF',
  dark: '#1B2A4A',
  accent: '#D4A843',
}
