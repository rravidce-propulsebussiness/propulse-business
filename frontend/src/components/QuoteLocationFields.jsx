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
    return rows.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')))
  }, [cities, stateId])

  const selectedCity = useMemo(
    () => cities.find(city => String(city.id) === String(cityId)) || null,
    [cities, cityId],
  )

  const [cityText, setCityText] = useState('')

  useEffect(() => {
    if (selectedCity) setCityText(String(selectedCity.name || ''))
    else if (!cityId) setCityText('')
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

  function detectCurrentLocation() {
    if (!navigator.geolocation) {
      onDetectedLocation?.({ error: 'Current location is not supported by this browser.' })
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
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
          onDetectedLocation?.({ error: error.message || 'Unable to detect current location.' })
        } finally {
          setLocating(false)
        }
      },
      error => {
        setLocating(false)
        const message = error.code === error.PERMISSION_DENIED
          ? 'Location permission was denied. Enter State, City or PIN manually.'
          : error.code === error.TIMEOUT
            ? 'Location detection timed out. Enter State, City or PIN manually.'
            : 'Unable to detect current location. Enter State, City or PIN manually.'
        onDetectedLocation?.({ error: message })
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    )
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
        <input
          list={listId}
          value={cityText}
          onChange={event => handleCityChange(event.target.value)}
          onBlur={handleCityBlur}
          placeholder={stateId ? 'Type city / location' : 'Select state first'}
          autoComplete="address-level2"
          disabled={!stateId}
        />
        <datalist id={listId}>
          {filteredCities.map(city => <option key={city.id} value={city.name} />)}
        </datalist>
        {stateId && !cityId && cityText ? <small className="qlf-city-hint">Choose a supported city from the suggestions.</small> : null}
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
