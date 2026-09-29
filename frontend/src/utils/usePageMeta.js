import { useEffect } from 'react'

function ensureDescriptionMeta(){
  let node=document.querySelector('meta[name="description"]')
  if(!node){
    node=document.createElement('meta')
    node.setAttribute('name','description')
    document.head.appendChild(node)
  }
  return node
}

export default function usePageMeta(title,description){
  useEffect(()=>{
    if(typeof document==='undefined')return
    if(title)document.title=title
    if(description)ensureDescriptionMeta().setAttribute('content',description)
  },[title,description])
}
