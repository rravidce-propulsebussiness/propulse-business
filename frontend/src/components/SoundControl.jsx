import {useEffect,useState} from 'react'
import {
  getSoundState,subscribeSoundState,refreshSoundSettings,
  setSoundEnabled,setSoundVolume,playSound,
} from '../utils/soundEffects'

/**
 * Optional personal sound preferences. No audio element is autoplayed:
 * the WebAudio engine starts only on a trusted interaction with the page.
 */
export default function SoundControl(){
  const [settings,setSettings]=useState(()=>getSoundState())
  const [open,setOpen]=useState(false)
  useEffect(()=>{
    const unsubscribe=subscribeSoundState(setSettings)
    return unsubscribe
  },[])
  useEffect(()=>{void refreshSoundSettings()},[])

  return <aside className="propulse-sound-control" data-sound="off"
    style={{position:'fixed',bottom:'1.2rem',left:'1.2rem',zIndex:45}}>
    <button type="button"
      aria-label="Website sound preferences"
      aria-expanded={open}
      onClick={()=>setOpen(v=>!v)}
      style={{border:'1px solid #cbd5e1',borderRadius:'99px',
        background:'#fff',color:'#273449',padding:'.45rem .75rem',
        boxShadow:'0 4px 16px #0f172a1c',fontSize:'.85rem'}}>
      {settings.enabled?'Sound':'Muted'}
    </button>
    {open&&<section aria-label="Website sound settings"
      style={{position:'absolute',bottom:'2.9rem',left:0,width:'225px',
        padding:'.9rem',border:'1px solid #cbd5e1',borderRadius:'.8rem',
        boxShadow:'0 8px 24px #0f172a26',background:'#fff',color:'#14213f'}}>
      <strong style={{display:'block',marginBottom:'.8rem'}}>Website sound</strong>
      <label style={{display:'flex',justifyContent:'space-between',gap:'.8rem'}}>
        Play optional sounds
        <input type="checkbox" checked={settings.enabled}
          onChange={e=>setSoundEnabled(e.target.checked)}/>
      </label>
      <label style={{display:'block',marginTop:'.8rem'}}>
        Personal volume
        <input type="range" min="0" max="100" step="5"
          aria-label="Personal volume"
          value={Math.round(settings.userVolume*100)}
          onChange={e=>setSoundVolume(Number(e.target.value)/100)}
          style={{display:'block',width:'100%'}}/>
      </label>
      <button type="button" onClick={()=>playSound('success')}
        disabled={!settings.enabled}
        style={{marginTop:'.7rem',border:'1px solid #94a3b8',
          borderRadius:'.45rem',padding:'.3rem .65rem',background:'#fff'}}>
        Test sound
      </button>
    </section>}
  </aside>
}
