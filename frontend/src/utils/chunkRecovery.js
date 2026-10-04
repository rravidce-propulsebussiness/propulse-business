const STALE_ASSET_ERROR=/failed to fetch dynamically imported module|unable to preload css|importing a module script failed|error loading dynamically imported module|failed to load module script/i
const RELOAD_KEY='propulse:stale-asset-reload-at'
const RELOAD_COOLDOWN_MS=60_000

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
  if(!canReload())return false
  window.location.reload()
  return true
}

export function installVitePreloadRecovery(){
  window.addEventListener('vite:preloadError',event=>{
    event.preventDefault()
    reloadOnceForStaleAsset(event,{force:true})
  })
}
