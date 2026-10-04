export default function PublicIcon({name,size=20}) {
  const p={width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'1.8',strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true}
  if(name==='arrow')return <svg {...p}><path d="M5 12h14M14 7l5 5-5 5"/></svg>
  if(name==='home')return <svg {...p}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>
  if(name==='building')return <svg {...p}><path d="M4 21V4h10v17"/><path d="M14 8h6v13"/><path d="M7 8h3M7 12h3M7 16h3M17 12h1M17 16h1"/></svg>
  if(name==='sofa')return <svg {...p}><path d="M5 11V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3"/><path d="M4 10a2 2 0 0 0-2 2v5h20v-5a2 2 0 0 0-2-2"/></svg>
  if(name==='pin')return <svg {...p}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
  if(name==='shield')return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
  if(name==='people')return <svg {...p}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 21a6 6 0 0 1 12 0M14 16a5 5 0 0 1 7 5"/></svg>
  if(name==='search')return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
  if(name==='check')return <svg {...p}><path d="m5 12 4 4L19 6"/></svg>
  if(name==='phone')return <svg {...p}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c1 .3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/></svg>
  if(name==='receipt')return <svg {...p}><path d="M6 2h12v20l-3-2-3 2-3-2-3 2Z"/><path d="M9 7h6M9 11h6M9 15h3"/></svg>
  if(name==='support')return <svg {...p}><path d="M4 13a8 8 0 0 1 16 0"/><path d="M4 13v5h3v-5H4ZM17 13h3v5h-3v-5ZM17 20c-1 1-2.5 1-4 1"/></svg>
  if(name==='handshake')return <svg {...p}><path d="m8 11 3 3c1 1 2 .8 3 0l3-3"/><path d="m3 8 4-4 4 4-4 4zM21 8l-4-4-4 4 4 4z"/><path d="M9 16l2 2c1 1 2 1 3 0l3-3"/></svg>
  return null
}
