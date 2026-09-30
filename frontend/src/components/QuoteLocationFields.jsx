import { useEffect, useMemo, useState } from 'react'
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
  cities = [],
  cityId = '',
  onCityChange,
  pincode = '',
  onPincodeChange,
  lookupStatus = '',
  lookupMessage = '',
  pinOptional = false,
  cityLabel = 'City / Location',
}) {
  const sortedCities = useMemo(
    () => [...cities].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''))),
    [cities],
  )

  const selectedCity = useMemo(
    () => sortedCities.find(city => String(city.id) === String(cityId)) || null,
    [sortedCities, cityId],
  )

  const [cityText, setCityText] = useState('')

  useEffect(() => {
    if (selectedCity) {
      setCityText(String(selectedCity.name || ''))
    } else if (!cityId) {
      setCityText(current => current)
    }
  }, [selectedCity, cityId])

  function resolveCity(value) {
    const normalized = String(value || '').trim().toLowerCase()
    if (!normalized) return null

    return (
      sortedCities.find(city => String(city.name || '').trim().toLowerCase() === normalized) ||
      sortedCities.find(city => {
        const withState = String(city.name || '').trim() + ', ' + String(city.state_name || '').trim()
        return withState.toLowerCase() === normalized
      }) ||
      null
    )
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

  return (
    <div className="quote-location-fields">
      <label className="quote-pin-field">
        <b>
          PIN Code {pinOptional ? <small>(Optional)</small> : null}
        </b>

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
            {lookupStatus === 'checking'
              ? '…'
              : lookupStatus === 'matched' || lookupStatus === 'state'
                ? '✓'
                : lookupStatus === 'error'
                  ? '!'
                  : 'PIN'}
          </span>
        </div>

        <PinStatus status={lookupStatus} message={lookupMessage} />
      </label>

      <label className="quote-city-field">
        <b>{cityLabel}</b>
        <input
          list="quote-city-options"
          value={cityText}
          onChange={event => handleCityChange(event.target.value)}
          onBlur={handleCityBlur}
          placeholder="Type city name"
          autoComplete="address-level2"
        />
        <datalist id="quote-city-options">
          {sortedCities.map(city => (
            <option key={city.id} value={city.name}>
              {city.state_name || ''}
            </option>
          ))}
        </datalist>

        {!cityId && cityText ? (
          <small className="qlf-city-hint">Choose a supported city from the suggestions.</small>
        ) : null}
      </label>
    </div>
  )
}
