import { useEffect, useId, useMemo, useState } from 'react'
import { publicRequest } from '../utils/auth'
import './QuoteLocationFields.css'

function PinStatus({ status, message }) {
  if (!message) return null
  return (
    <small id="quote-pin-status" className={'qlf-status ' + (status || '')}>
      {status === 'checking' ? <i /> : null}
      {message}
    </small>
  )
}

export default function QuoteLocationFields({
  states = [],
  stateId = '',
  onStateChange,
  cities = [],
  cityId = '',
  onCityChange,
  pincode = '',
  onPincodeChange,
  onDetectedLocation,
  lookupStatus = '',
  lookupMessage = '',
  pinOptional = false,
  stateLabel = 'State',
  cityLabel = 'City / Location',
}) {
  const listId = useId().replace(/:/g, '')
  const [locating, setLocating] = useState(false)

  const filteredCities = useMemo(() => {
    const rows = stateId
      ? cities.filter(city => String(city?.state_id || '') === String(stateId))
      : []
    return [...rows].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')))
  }, [cities, stateId])

  const selectedCity = useMemo(
    () => cities.find(city => String(city.id) === String(cityId)) || null,
    [cities, cityId],
  )

  const [cityText, setCityText] = useState('')
  const [cityFocused, setCityFocused] = useState(false)

  const citySuggestions = useMemo(() => {
    const query = cityText.trim().toLowerCase()
    if (query.length < 3) return []
    return filteredCities
      .filter(city => String(city?.name || '').toLowerCase().startsWith(query))
      .slice(0, 8)
  }, [filteredCities, cityText])

  useEffect(() => {
    let active=true
    queueMicrotask(()=>{
      if(!active)return
      if (selectedCity) setCityText(String(selectedCity.name || ''))
      else if (!cityId) setCityText('')
    })
    return()=>{active=false}
  }, [selectedCity, cityId, stateId])

  function resolveCity(value) {
    const normalized = String(value || '').trim().toLowerCase()
    if (!normalized) return null
    return filteredCities.find(city => String(city.name || '').trim().toLowerCase() === normalized) || null
  }

  function handleStateChange(value) {
    setCityText('')
    onStateChange?.(value)
  }

  function handleCityChange(value) {
    setCityText(value)
    if (!String(value || '').trim()) {
      onCityChange?.('')
      return
    }
    const matchedCity = resolveCity(value)
    if (matchedCity) onCityChange?.(String(matchedCity.id))
  }

  function handleCityBlur() {
    const matchedCity = resolveCity(cityText)
    if (matchedCity) {
      setCityText(String(matchedCity.name || cityText))
      onCityChange?.(String(matchedCity.id))
    }
  }

  async function detectCurrentLocation() {
    if (!window.isSecureContext) {
      onDetectedLocation?.({ error: 'Location requires a secure HTTPS connection.' })
      return
    }
    if (!navigator.geolocation) {
      onDetectedLocation?.({ error: 'Current location is not supported by this browser.' })
      return
    }

    setLocating(true)

    const locate = () => navigator.geolocation.getCurrentPosition(
      async position => {
        try {
          const data = await publicRequest('/pincodes/reverse-location', {
            method: 'POST',
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          })
          onDetectedLocation?.(data)
        } catch (error) {
          onDetectedLocation?.({ error: error.message || 'Location was detected, but the address could not be matched. Enter State, City or PIN manually.' })
        } finally {
          setLocating(false)
        }
      },
      error => {
        setLocating(false)
        const message = error.code === error.PERMISSION_DENIED
          ? 'Location access is blocked for this site. Tap the browser site controls, allow Location, then tap “Use my current location” again.'
          : error.code === error.TIMEOUT
            ? 'Location detection timed out. Please try again or enter State, City or PIN manually.'
            : 'Unable to detect current location. Turn on device Location and try again.'
        onDetectedLocation?.({ error: message })
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )

    // Call geolocation directly from the user's tap. This lets the browser show
    // its native permission prompt whenever permission is still promptable.
    locate()
  }

  return (
    <div className="quote-location-fields">
      <label className="quote-state-field">
        <b>{stateLabel}</b>
        <select value={stateId} onChange={event => handleStateChange(event.target.value)} autoComplete="address-level1">
          <option value="">Select State</option>
          {states.map(state => <option key={state.id} value={state.id}>{state.name}</option>)}
        </select>
      </label>

      <label className="quote-city-field">
        <b>{cityLabel}</b>
        <div className="qlf-city-autocomplete">
          <input
            value={cityText}
            onChange={event => handleCityChange(event.target.value)}
            onFocus={() => setCityFocused(true)}
            onBlur={() => {
              window.setTimeout(() => {
                handleCityBlur()
                setCityFocused(false)
              }, 120)
            }}
            placeholder={stateId ? 'Type City / Location' : 'Select state first'}
            autoComplete="off"
            disabled={!stateId}
          />
          {cityFocused && citySuggestions.length > 0 ? <div className="qlf-city-suggestions" role="listbox">
            {citySuggestions.map(city => <button
              type="button"
              role="option"
              key={city.id}
              onMouseDown={event => event.preventDefault()}
              onClick={() => {
                setCityText(String(city.name || ''))
                onCityChange?.(String(city.id))
                setCityFocused(false)
              }}
            >{city.name}</button>)}
          </div> : null}
        </div>
        {stateId && !cityId && cityText.length >= 3 && citySuggestions.length === 0 ? <small className="qlf-city-hint">No supported city found for this state.</small> : null}
      </label>

      <label className="quote-pin-field">
        <b>PIN Code {pinOptional ? <small>(Optional)</small> : null}</b>
        <div className="qlf-pin-wrap">
          <input
            value={pincode}
            onChange={event => onPincodeChange?.(event.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength="6"
            placeholder="Enter 6-digit PIN"
            aria-describedby="quote-pin-status"
          />
          <span className={'qlf-pin-indicator ' + (lookupStatus || '')}>
            {lookupStatus === 'checking' ? '…' : lookupStatus === 'matched' || lookupStatus === 'state' ? '✓' : lookupStatus === 'error' ? '!' : 'PIN'}
          </span>
        </div>
        <PinStatus status={lookupStatus} message={lookupMessage} />
      </label>

      <button className="qlf-current-location" type="button" onClick={detectCurrentLocation} disabled={locating}>
        <span aria-hidden="true">⌖</span>
        {locating ? 'Detecting current location…' : 'Use my current location'}
      </button>
    </div>
  )
}
