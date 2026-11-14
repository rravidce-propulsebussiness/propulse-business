// "reading 'default'" is React.lazy receiving an undefined module after a cancelled chunk preload.
const STALE_ASSET_ERROR=/failed to fetch dynamically imported module|unable to preload css|importing a module script failed|error loading dynamically imported module|failed to load module script|reading 'default'/i
const RELOAD_KEY='propulse:stale-asset-reload-at'
const RELOAD_COOLDOWN_MS=60_000
let reloading=false

export function isReloadingForStaleAsset(){
  return reloading
}

function canReload(){
  try{
    const now=Date.now()
    const last=Number(window.sessionStorage.getItem(RELOAD_KEY)||0)
    if(Number.isFinite(last)&&last>0&&now-last<RELOAD_COOLDOWN_MS)return false
    window.sessionStorage.setItem(RELOAD_KEY,String(now))
  }catch{}
  return true
}

export function reloadOnceForStaleAsset(error,{force=false}={}){
  const message=String(error?.message||error?.reason?.message||error||'')
  if(!force&&!STALE_ASSET_ERROR.test(message))return false
  if(reloading)return true
  if(!canReload())return false
  reloading=true
  window.location.reload()
  return true
}

export function installVitePreloadRecovery(){
  window.addEventListener('vite:preloadError',event=>{
    // Cancelling the error makes the dynamic import resolve to undefined, which crashes
    // React.lazy ("reading 'default'"). Only cancel it when a reload is really happening;
    // otherwise let the real error reach the error boundary, which offers a reload button.
    if(reloadOnceForStaleAsset(event,{force:true}))event.preventDefault()
  })
}
