import {useEffect} from 'react'
import {useLocation} from 'react-router-dom'

// The SEO route tables (~100 KB) used to be bundled into every page. Load them
// only when needed: the prebuilt HTML already carries correct tags for the
// first page view, so this only has to keep tags right after in-app navigation.
let seoModule=null
const loadSeo=()=>(seoModule||=import('./seoApply.js'))

export default function SeoManager(){
  const {pathname}=useLocation()
  useEffect(()=>{
    let active=true
    loadSeo().then(module=>{if(active)module.applySeo({pathname})}).catch(()=>{seoModule=null})
    return()=>{active=false}
  },[pathname])
  return null
}
