import {API_BASE_URL} from './api'

const DEFAULT_CONFIG={
  masterEnabled:true,
  clickEnabled:true,
  successEnabled:true,
  warningEnabled:true,
  uploadEnabled:true,
  notificationEnabled:true,
  defaultVolume:0.2,
}

const STORAGE_ENABLED='propulse_sound_enabled'
const STORAGE_VOLUME='propulse_sound_volume'

let config={...DEFAULT_CONFIG}
let enabled=true
let userVolume=1
let audioContext=null
let interactionReady=false
let installed=false
const listeners=new Set()

function storageGet(key){
  try{return window.localStorage.getItem(key)}catch{return null}
}

function storageSet(key,value){
  try{window.localStorage.setItem(key,value)}catch{}
}

function readPreferences(){
  const storedEnabled=storageGet(STORAGE_ENABLED)
  enabled=storedEnabled===null?true:storedEnabled!=='false'
  const parsed=Number(storageGet(STORAGE_VOLUME))
  userVolume=Number.isFinite(parsed)?Math.max(0,Math.min(1,parsed)):1
}

function snapshot(){
  return {
    enabled,
    userVolume,
    config:{...config},
    effectiveVolume:Math.max(0,Math.min(0.5,Number(config.defaultVolume||0.2)))*userVolume,
  }
}

function notify(){
  const state=snapshot()
  listeners.forEach(listener=>{try{listener(state)}catch{}})
}

export function subscribeSoundState(listener){
  listeners.add(listener)
  listener(snapshot())
  return()=>listeners.delete(listener)
}

export function getSoundState(){
  return snapshot()
}

export function setSoundEnabled(value){
  enabled=Boolean(value)
  storageSet(STORAGE_ENABLED,String(enabled))
  notify()
  return enabled
}

export function setSoundVolume(value){
  const parsed=Number(value)
  userVolume=Number.isFinite(parsed)?Math.max(0,Math.min(1,parsed)):1
  storageSet(STORAGE_VOLUME,String(userVolume))
  notify()
  return userVolume
}

function categoryEnabled(type){
  if(!config.masterEnabled||!enabled)return false
  if(type==='click')return config.clickEnabled
  if(type==='success')return config.successEnabled
  if(type==='warning')return config.warningEnabled
  if(type==='upload')return config.uploadEnabled
  if(type==='notification')return config.notificationEnabled
  return false
}

function userGestureActive(){
  try{return Boolean(navigator.userActivation?.isActive)}catch{return false}
}

function ensureContext(){
  if(audioContext)return audioContext
  if(!userGestureActive())return null
  const AudioContextCtor=window.AudioContext||window.webkitAudioContext
  if(!AudioContextCtor)return null
  audioContext=new AudioContextCtor()
  return audioContext
}

function unlock(){
  if(!userGestureActive())return Promise.resolve(false)
  interactionReady=true
  const ctx=ensureContext()
  if(!ctx)return Promise.resolve(false)
  if(ctx.state==='running')return Promise.resolve(true)
  return ctx.resume().then(()=>ctx.state==='running').catch(()=>false)
}

const PATTERNS={
  click:[
    {frequency:420,duration:0.032,delay:0,wave:'triangle',gain:0.32},
  ],
  success:[
    {frequency:523,duration:0.07,delay:0,wave:'sine',gain:0.30},
    {frequency:659,duration:0.07,delay:0.055,wave:'sine',gain:0.28},
    {frequency:784,duration:0.1,delay:0.11,wave:'sine',gain:0.24},
  ],
  warning:[
    {frequency:330,duration:0.08,delay:0,wave:'triangle',gain:0.30},
    {frequency:262,duration:0.12,delay:0.075,wave:'triangle',gain:0.24},
  ],
  upload:[
    {frequency:440,duration:0.06,delay:0,wave:'sine',gain:0.30},
    {frequency:660,duration:0.09,delay:0.055,wave:'sine',gain:0.26},
  ],
  notification:[
    {frequency:740,duration:0.075,delay:0,wave:'sine',gain:0.28},
    {frequency:988,duration:0.13,delay:0.08,wave:'sine',gain:0.23},
  ],
}

function schedulePattern(ctx,type){
  const notes=PATTERNS[type]
  if(!notes?.length)return false
  const baseVolume=Math.max(0,Math.min(0.5,Number(config.defaultVolume||0.2)))*userVolume
  if(baseVolume<=0)return false
  const now=ctx.currentTime+0.006
  notes.forEach(note=>{
    const oscillator=ctx.createOscillator()
    const gain=ctx.createGain()
    const start=now+note.delay
    const stop=start+note.duration
    oscillator.type=note.wave
    oscillator.frequency.setValueAtTime(note.frequency,start)
    gain.gain.setValueAtTime(0.0001,start)
    gain.gain.linearRampToValueAtTime(Math.max(0.0001,baseVolume*note.gain),start+0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001,stop)
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start(start)
    oscillator.stop(stop+0.015)
  })
  return true
}

export function playSound(type){
  if(typeof window==='undefined'||!interactionReady||!categoryEnabled(type))return false
  const ctx=ensureContext()
  if(!ctx||!PATTERNS[type]?.length)return false
  if(ctx.state==='running')return schedulePattern(ctx,type)
  ctx.resume()
    .then(()=>{if(ctx.state==='running')schedulePattern(ctx,type)})
    .catch(()=>{})
  return true
}

export function emitSound(type){
  return playSound(type)
}

export async function refreshSoundSettings(){
  try{
    const response=await fetch(`${API_BASE_URL}/sound-settings`,{credentials:'include'})
    if(!response.ok)return snapshot()
    const next=await response.json()
    config={...DEFAULT_CONFIG,...next,defaultVolume:Math.max(0,Math.min(0.5,Number(next?.defaultVolume??DEFAULT_CONFIG.defaultVolume)))}
    notify()
  }catch{}
  return snapshot()
}

export function installSoundEffects(){
  if(typeof window==='undefined'||installed)return
  installed=true
  readPreferences()
  const unlockOnce=event=>{if(event?.isTrusted!==false)unlock()}
  window.addEventListener('click',unlockOnce,{capture:true,passive:true})
  window.addEventListener('touchend',unlockOnce,{capture:true,passive:true})
  window.addEventListener('keydown',unlockOnce,{capture:true})
  document.addEventListener('click',event=>{
    const element=event.target?.closest?.('button,a,[role="button"],input[type="button"],input[type="submit"]')
    if(!element||element.matches(':disabled,[aria-disabled="true"]')||element.closest('[data-sound="off"]'))return
    playSound('click')
  },true)
  window.addEventListener('propulse:sound',event=>playSound(event?.detail?.type))
  refreshSoundSettings()
}
