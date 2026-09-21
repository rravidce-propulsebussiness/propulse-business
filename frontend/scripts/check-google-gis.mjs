import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
const button = fs.readFileSync(path.join(root, 'src/components/GoogleButton.jsx'), 'utf8')
const loader = fs.readFileSync(path.join(root, 'src/utils/googleIdentityServices.js'), 'utf8')

const checks = [
  ['GIS is loaded by the shared loader', loader.includes("https://accounts.google.com/gsi/client")],
  ['GoogleButton uses the shared GIS loader', button.includes('loadGoogleIdentityServices')],
  ['GoogleButton initializes GIS', button.includes('googleId.initialize')],
  ['GoogleButton renders GIS button', button.includes('googleId.renderButton')],
  ['Google client ID comes from Vite env', button.includes('VITE_GOOGLE_CLIENT_ID') || loader.includes('VITE_GOOGLE_CLIENT_ID')],
  ['GIS is not statically duplicated in index.html', !index.includes('accounts.google.com/gsi/client')],
  ['FedCM button behavior is explicit', button.includes('use_fedcm_for_button: false')],
]

let failed = false
for (const [name, passed] of checks) {
  console.log((passed ? 'PASS' : 'FAIL') + '  ' + name)
  if (!passed) failed = true
}

if (failed) process.exit(1)
console.log('Google Identity Services static checks passed.')
