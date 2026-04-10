import { useDemoGuard } from '../context/DemoContext'
import { BRAND } from '../config/brand'

export default function DemoAlert() {
  const { showAlert, alertMessage } = useDemoGuard()

  if (!showAlert) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      background: BRAND.dark,
      border: `1px solid ${BRAND.accent}`,
      borderRadius: '12px',
      padding: '14px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      minWidth: '320px',
      maxWidth: '480px',
      animation: 'slideUp 0.3s ease'
    }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="5" y="11" width="14" height="10" rx="2" fill={BRAND.accent} />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke={BRAND.accent} strokeWidth="2" strokeLinecap="round" />
      </svg>

      <div>
        <div style={{
          color: 'white',
          fontWeight: 600,
          fontSize: '14px'
        }}>
          Demo Mode
        </div>
        <div style={{
          color: 'rgba(255,255,255,0.6)',
          fontSize: '12px',
          marginTop: '2px'
        }}>
          {alertMessage}
        </div>
      </div>
    </div>
  )
}
