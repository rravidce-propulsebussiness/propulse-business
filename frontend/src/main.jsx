import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './leadPaymentFix.css'
import './leadMarketplaceEnhancer.js'
import './leadCouponUiEnhancer.js'
import './walletCouponEnhancer.js'
import './admin/leadImportBulkEnhancer.js'
import './homeLeadHighlight.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
