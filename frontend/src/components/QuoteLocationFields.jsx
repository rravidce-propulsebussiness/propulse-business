import { useState } from 'react'
import { publicRequest } from '../utils/auth'
import './QuoteLocationFields.css'

function PinStatus({status,message}){
  if(!message)return null
  return <small id="quote-pin-status" className={'qlf-status '+(status||'')}>{status==='checking'?<i/>:null}{message}</small>
}

export default function QuoteLocationFields({
  states=[],
  stateId='',
  onStateChange,
  cities=[],
  cityId='',
  onCityChange,
  pincode='',
  onPincodeChange,
  lookupStatus='',
  lookupMessage='',
  pinOptional=false,
  stateLabel='State',
  cityLabel='City / Location',
  onDetectedLocation,
}){
  const [locating,setLocating]=useState(false)

  function detectCurrentLocation(){
    if(!navigator.geolocation){
      onDetectedLocation?.({error:'Current location is not supported by this browser.'})
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async position=>{
        try{
          const data=await publicRequest('/pincodes/reverse-location',{
            method:'POST',
            body:JSON.stringify({
              latitude:position.coords.latitude,
              longitude:position.coords.longitude,
            }),
          })
          onDetectedLocation?.(data)
        }catch(error){
          onDetectedLocation?.({error:error.message||'Unable to detect current location.'})
        }finally{
          setLocating(false)
        }
      },
      error=>{
        setLocating(false)
        const message=error.code===error.PERMISSION_DENIED
          ? 'Location permission was denied. Enter State, City or PIN manually.'
          : error.code===error.TIMEOUT
            ? 'Location detection timed out. Enter State, City or PIN manually.'
            : 'Unable to detect current location. Enter State, City or PIN manually.'
        onDetectedLocation?.({error:message})
      },
      {enableHighAccuracy:false,timeout:10000,maximumAge:300000}
    )
  }

  return <div className="quote-location-fields">
    <label>
      <b>{stateLabel}</b>
      <select value={stateId} onChange={event=>onStateChange?.(event.target.value)}>
        <option value="">Select State</option>
        {states.map(state=><option key={state.id} value={state.id}>{state.name}</option>)}
      </select>
    </label>

    <label>
      <b>{cityLabel}</b>
      <select value={cityId} onChange={event=>onCityChange?.(event.target.value)} disabled={!stateId}>
        <option value="">{stateId?'Select City / Location':'Select state first'}</option>
        {cities.map(city=><option key={city.id} value={city.id}>{city.name}</option>)}
      </select>
    </label>

    <label className="quote-pin-field">
      <b>PIN Code {pinOptional&&<small>(Optional)</small>}</b>
      <div className="qlf-pin-wrap">
        <input
          value={pincode}
          onChange={event=>onPincodeChange?.(event.target.value.replace(/\D/g,'').slice(0,6))}
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength="6"
          placeholder="Enter 6-digit PIN"
          aria-describedby="quote-pin-status"
        />
        <span className={'qlf-pin-indicator '+(lookupStatus||'')}>
          {lookupStatus==='checking'?'…':lookupStatus==='matched'?'✓':lookupStatus==='state'?'✓':lookupStatus==='error'?'!':'PIN'}
        </span>
      </div>
      <PinStatus status={lookupStatus} message={lookupMessage}/>
    </label>

    <button className="qlf-current-location" type="button" onClick={detectCurrentLocation} disabled={locating}>
      <span aria-hidden="true">⌖</span>
      {locating?'Detecting current location…':'Use my current location'}
    </button>
  </div>
}
