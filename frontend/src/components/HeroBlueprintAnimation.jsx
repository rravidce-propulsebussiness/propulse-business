import { useEffect, useRef, useState } from 'react'
import './HeroBlueprintAnimation.css'

export default function HeroBlueprintAnimation() {
  const videoRef = useRef(null)
  const audioRef = useRef(null)
  const [soundOn,setSoundOn] = useState(false)

  useEffect(() => () => {
    if (audioRef.current) {
      audioRef.current.oscillators.forEach((oscillator) => {
        try { oscillator.stop() } catch {}
      })
      audioRef.current.context.close().catch(() => {})
    }
  }, [])

  const toggleSound = async () => {
    if (soundOn) {
      if (audioRef.current) audioRef.current.master.gain.setTargetAtTime(0,audioRef.current.context.currentTime,.25)
      setSoundOn(false)
      return
    }

    if (!audioRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return
      const context = new AudioContext()
      const master = context.createGain()
      master.gain.value = 0
      master.connect(context.destination)

      const frequencies = [110,164.81,220]
      const oscillators = frequencies.map((frequency,index) => {
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        oscillator.type = index === 0 ? 'sine' : 'triangle'
        oscillator.frequency.value = frequency
        gain.gain.value = index === 0 ? .035 : .012
        oscillator.connect(gain)
        gain.connect(master)
        oscillator.start()
        return oscillator
      })

      const shimmer = context.createOscillator()
      const shimmerGain = context.createGain()
      shimmer.type = 'sine'
      shimmer.frequency.value = 329.63
      shimmerGain.gain.value = .006
      shimmer.connect(shimmerGain)
      shimmerGain.connect(master)
      shimmer.start()
      audioRef.current = { context,master,oscillators:[...oscillators,shimmer] }
    }

    await audioRef.current.context.resume()
    audioRef.current.master.gain.setTargetAtTime(.7,audioRef.current.context.currentTime,.35)
    setSoundOn(true)
    videoRef.current?.play().catch(() => {})
  }

  return <div className="cinematic-hero">
    <video ref={videoRef} className="cinematic-hero-video" autoPlay muted loop playsInline preload="auto" aria-label="ProPulse journey from plot to completed home and interior">
      <source src="/media/propulse-home-journey.mp4" type="video/mp4" />
    </video>
    <div className="cinematic-hero-vignette" aria-hidden="true" />
    <div className="cinematic-hero-glow" aria-hidden="true" />
    <button className={'cinematic-sound'+(soundOn?' is-on':'')} type="button" onClick={toggleSound} aria-label={soundOn?'Mute background music':'Play background music'} aria-pressed={soundOn}>
      <span className="sound-bars" aria-hidden="true"><i/><i/><i/></span>
    </button>
  </div>
}
