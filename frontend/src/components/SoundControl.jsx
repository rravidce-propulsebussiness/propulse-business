import {useEffect,useRef,useState} from 'react'
import {getSoundState,playSound,refreshSoundSettings,setSoundEnabled,setSoundVolume,subscribeSoundState} from '../utils/soundEffects'
import './SoundControl.css'

export default function SoundControl(){
  const [state,setState]=useState(()=>getSoundState())
  const [open,setOpen]=useState(false)
  const ref=useRef(null)

  useEffect(()=>subscribeSoundState(setState),[])
  useEffect(()=>{void refreshSoundSettings()},[])
  useEffect(()=>{
    if(!open)return undefined
    const close=event=>{if(ref.current&&!ref.current.contains(event.target))setOpen(false)}
    document.addEventListener('mousedown',close)
    return()=>document.removeEventListener('mousedown',close)
  },[open])

  const active=state.config.masterEnabled&&state.enabled&&state.effectiveVolume>0

  return <div className="sound-control" ref={ref} data-sound="off">
    {open&&<div className="sound-control-panel">
      <div className="sound-control-head">
        <div><b>Website sound</b><small>{state.config.masterEnabled?'Your preference is saved on this device.':'Sound is disabled by Admin.'}</small></div>
        <button type="button" onClick={()=>setOpen(false)} aria-label="Close sound settings">×</button>
      </div>
      <label className="sound-control-switch">
        <span><b>Sound effects</b><small>Clicks, confirmations and notifications</small></span>
        <input type="checkbox" checked={state.enabled&&state.config.masterEnabled} disabled={!state.config.masterEnabled} onChange={event=>setSoundEnabled(event.target.checked)}/>
        <i/>
      </label>
      <label className="sound-control-volume">
        <span><b>Personal volume</b><strong>{Math.round(state.userVolume*100)}%</strong></span>
        <input type="range" min="0" max="100" step="5" value={Math.round(state.userVolume*100)} disabled={!state.config.masterEnabled||!state.enabled} onChange={event=>setSoundVolume(Number(event.target.value)/100)}/>
      </label>
      <button type="button" className="sound-control-test" disabled={!active} onClick={()=>playSound('success')}>Test sound</button>
    </div>}
    <button type="button" className={'sound-control-button'+(active?' active':'')} aria-label={active?'Sound effects on':'Sound effects off'} aria-expanded={open} title="Sound effects" onClick={()=>setOpen(value=>!value)}>
      <span aria-hidden="true">{active?'🔊':'🔇'}</span>
    </button>
  </div>
}
