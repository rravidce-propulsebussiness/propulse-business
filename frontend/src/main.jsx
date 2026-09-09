import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './leadPaymentFix.css'
import './pendingLead.css'
import './walletCouponEnhancer.js'
import './admin/leadImportBulkEnhancer.js'
import './adminPaymentCouponEnhancer.js'
import './homeLeadHighlight.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
