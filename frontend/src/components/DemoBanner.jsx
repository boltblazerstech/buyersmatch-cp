import { isDemoMode, BRAND } from '../config/brand'

export default function DemoBanner() {
  if (!isDemoMode) return null

  return (
    <div style={{
      background: BRAND.accent,
      color: BRAND.dark,
      textAlign: 'center',
      padding: '8px 16px',
      fontSize: '12px',
      fontWeight: 700,
      letterSpacing: '0.05em',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      DEMO MODE — Client data is anonymized. All financial data is real. Write actions are disabled.
    </div>
  )
}
