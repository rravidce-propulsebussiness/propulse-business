import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'
import {installClientObservability} from './utils/clientObservability.js'
import {installSoundEffects} from './utils/soundEffects.js'
import {installVitePreloadRecovery} from './utils/chunkRecovery.js'
import {installWebMcpTools} from './utils/webMcp.js'

installClientObservability()
installSoundEffects()
installVitePreloadRecovery()
installWebMcpTools()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)
