import {useEffect,useRef} from 'react'
import './ProjectMediaViewer.css'

// Only known, embeddable providers and direct files render in ProPulse.
// Never use a pasted URL as a top-level navigation target.
export function projectMediaPreview(raw, type='video'){
  if(typeof raw!=='string'||!raw.trim())return {kind:'missing'}
  let url
  try{
    const input=raw.trim()
    if(input.startsWith('//'))return {kind:'unsupported'}
    url=new URL(input,window.location.origin)
    if(url.protocol!=='https:'&&!(url.protocol==='http:'&&url.origin===window.location.origin))return {kind:'unsupported'}
    if(url.username||url.password)return {kind:'unsupported'}
  }catch{return {kind:'unsupported'}}
  const host=url.hostname.toLowerCase().replace(/^www\./,'')
  const pathname=url.pathname
  const directMediaAllowed=url.origin===window.location.origin||host.endsWith('.r2.cloudflarestorage.com')
  if(type==='video'){
    let id=''
    if(host==='youtu.be')id=pathname.split('/')[1]||''
    else if(['youtube.com','m.youtube.com','youtube-nocookie.com'].includes(host)){
      if(pathname==='/watch')id=url.searchParams.get('v')||''
      else if(/^\/(embed|shorts|live)\//.test(pathname))id=pathname.split('/')[2]||''
    }
    if(/^[A-Za-z0-9_-]{11}$/.test(id))
      return {kind:'embed',provider:'YouTube',src:'https://www.youtube-nocookie.com/embed/'+id}
    let vimeoId=''
    if(host==='vimeo.com')vimeoId=pathname.split('/').filter(Boolean)[0]||''
    if(host==='player.vimeo.com'&&pathname.startsWith('/video/'))vimeoId=pathname.split('/')[2]||''
    if(/^\d+$/.test(vimeoId))
      return {kind:'embed',provider:'Vimeo',src:'https://player.vimeo.com/video/'+vimeoId}
    if(directMediaAllowed&&(/\.(mp4|webm|mov)(?:$)/i.test(pathname)||pathname.startsWith('/uploads/business-projects/')))
      return {kind:'video',src:url.href}
    return {kind:'unsupported'}
  }
  if(directMediaAllowed&&/\.(jpg|jpeg|png|webp)$/i.test(pathname))return {kind:'image',src:url.href}
  if(directMediaAllowed&&/\.pdf$/i.test(pathname))return {kind:'pdf',src:url.href}
  if(host==='drive.google.com'){
    const match=pathname.match(/^\/file\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/)
    const id=match?.[1]||(pathname==='/open'?url.searchParams.get('id'):'')
    if(id&&/^[a-zA-Z0-9_-]+$/.test(id))
      return {kind:'embed',provider:'Google Drive',src:'https://drive.google.com/file/d/'+id+'/preview'}
  }
  return {kind:'unsupported'}
}

export function ProjectMediaContent({preview,title='',className=''}) {
  if(preview.kind==='video')return <video className={className} src={preview.src} controls playsInline preload="metadata"/>
  if(preview.kind==='image')return <img className={className} src={preview.src} alt={title||'Project drawing'}/>
  if(preview.kind==='pdf')return <iframe className={className} src={preview.src} title={title||'Project PDF'} sandbox="allow-same-origin" referrerPolicy="no-referrer" loading="lazy"/>
  if(preview.kind==='embed')return <iframe className={className} src={preview.src} title={title||preview.provider+' preview'} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen sandbox="allow-scripts allow-same-origin allow-presentation" referrerPolicy="strict-origin-when-cross-origin" loading="lazy"/>
  return <div className="project-media-unavailable" role="status">
    <strong>Preview unavailable inside ProPulse</strong>
    <p>This link is not a supported embeddable file or video. Upload an MP4/WebM video, PDF or image directly to ProPulse, or use a public YouTube, Vimeo or Google Drive file link. Private files and embeds blocked by their providers cannot be shown here.</p>
  </div>
}

export default function ProjectMediaViewer({url,type='video',title='',onClose}){
  const dialogRef=useRef(null)
  const preview=projectMediaPreview(url,type)
  useEffect(()=>{
    const previous=document.body.style.overflow
    document.body.style.overflow='hidden'
    dialogRef.current?.focus()
    const onKey=event=>{if(event.key==='Escape')onClose()}
    window.addEventListener('keydown',onKey)
    return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',onKey)}
  },[onClose])
  return <div className="project-media-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
    <section className="project-media-dialog" ref={dialogRef} role="dialog" aria-modal="true" tabIndex={-1} aria-label={title||'Project media preview'}>
      <header className="project-media-dialog-head">
        <div><small>PROPULSE PROJECT VIEWER</small><h2>{title||'Project media'}</h2></div>
        <button type="button" onClick={onClose} aria-label="Close project media preview">×</button>
      </header>
      <div className="project-media-dialog-body">
        <ProjectMediaContent preview={preview} title={title} className="project-media-content"/>
        {(preview.kind==='embed'||preview.kind==='pdf')&&<small className="project-media-note">This content is displayed inside ProPulse. If it stays blank, the external provider may restrict embedding; upload the file directly to ProPulse instead.</small>}
      </div>
    </section>
  </div>
}
