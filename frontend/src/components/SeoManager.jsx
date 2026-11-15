import {useEffect} from 'react'
import {useLocation} from 'react-router-dom'
import { apiRequest } from '../utils/api'

// The SEO route tables (~100 KB) used to be bundled into every page. Load them
// only when needed: the prebuilt HTML already carries correct tags for the
// first page view, so this only has to keep tags right after in-app navigation.
let seoModule=null
const loadSeo=()=>(seoModule||=import('./seoApply.js'))

export default function SeoManager(){
  const {pathname}=useLocation()
  useEffect(()=>{
    let active=true
    loadSeo().then(async module=>{if(!active)return;module.applySeo({pathname});try{const overrides=await apiRequest('/website-pages?path='+encodeURIComponent(pathname),{},false);if(active)module.applySeo({pathname},overrides)}catch{}}).catch(()=>{seoModule=null})
    return()=>{active=false}
  },[pathname])
  return null
}
