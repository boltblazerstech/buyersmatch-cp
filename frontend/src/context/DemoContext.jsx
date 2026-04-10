import { createContext, useContext, useState } from 'react'
import { isDemoMode } from '../config/brand'

const DemoContext = createContext()

export function DemoProvider({ children }) {
  const [showAlert, setShowAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')

  const guard = (callback, customMessage) => {
    if (isDemoMode) {
      setAlertMessage(
        customMessage ||
        'This action is disabled in demo mode.')
      setShowAlert(true)
      setTimeout(() => setShowAlert(false), 3500)
      return false
    }
    if (callback) callback()
    return true
  }

  return (
    <DemoContext.Provider value={{ guard, showAlert, alertMessage }}>
      {children}
    </DemoContext.Provider>
  )
}

export const useDemoGuard = () => useContext(DemoContext)
