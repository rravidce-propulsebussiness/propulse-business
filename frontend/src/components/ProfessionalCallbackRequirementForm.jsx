import {useEffect,useId,useMemo,useRef,useState} from 'react'
import {publicRequest} from '../utils/auth'
import './ProfessionalCallbackRequirementForm.css'

export const emptyProfessionalCallback={
  pincode:'',cityId:'',cityName:'',flowKey:'',projectType:'',floors:'',plotArea:'',
  propertyType:'',bhk:'',propertyIntent:'',budget:'',
  name:'',phone:'',email:'',message:'',consent:false,website:'',
}

const FLOORS=[['1','Ground Floor'],['2','G+1'],['3','G+2'],['4','G+3 and above']]
const collection=data=>Array.isArray(data)?data:Array.isArray(data?.data)?data.data:[]
const cityText=city=>city?city.name+(city.state_name?' · '+city.state_name:''):''
const digits=value=>String(value||'').replace(/\D/g,'')
const normal=value=>String(value||'').trim().toLowerCase()

/** Same quick requirement fields for a selected professional and a project callback. */
export default function ProfessionalCallbackRequirementForm({value,onChange,onSubmit,busy=false,error='',submitLabel='Send Callback Request'}){
  const [cities,setCities]=useState([])
  const [loadingCities,setLoadingCities]=useState(true)
  const [citySearch,setCitySearch]=useState(value.cityName||'')
  const [detected,setDetected]=useState('')
  const [pinBusy,setPinBusy]=useState(false)
  const [localError,setLocalError]=useState('')
  const seq=useRef(0)
  const cityListId=useId()
  const cityList=useMemo(()=>[...cities].sort((a,b)=>String(a.name).localeCompare(String(b.name))),[cities])
  const update=patch=>{onChange(previous=>({...previous,...patch}));setLocalError('')}
  const exactCity=text=>cityList.find(city=>normal(cityText(city))===normal(text)||normal(city.name)===normal(text))||null

  useEffect(()=>{
    let live=true
    publicRequest('/cities').then(data=>{if(live)setCities(collection(data))})
      .catch(()=>{if(live)setLocalError('Unable to load cities. Please refresh and try again.')})
      .finally(()=>{if(live)setLoadingCities(false)})
    return()=>{live=false;seq.current++}
  },[])

  // The PIN remains authoritative. Match the detected city to the same city
  // catalog that the quick requirement popup uses; do not invent city IDs.
  async function updatePin(raw){
    const pin=digits(raw).slice(0,6),requestId=++seq.current
    update({pincode:pin,cityId:'',cityName:''})
    setDetected('')
    setCitySearch('')
    if(pin.length!==6)return
    setPinBusy(true)
    try{
      const result=await publicRequest('/pincodes/location/'+pin)
      if(requestId!==seq.current)return
      const city=cityList.find(item=>String(item.id)===String(result?.cityId))
        ||cityList.find(item=>normal(item.name)===normal(result?.cityName)&&(!result?.stateName||normal(item.state_name)===normal(result.stateName)))
      const label=city?cityText(city):[result?.cityName,result?.stateName].filter(Boolean).join(' · ')
      setDetected(label)
      if(city){setCitySearch(cityText(city));update({cityId:String(city.id),cityName:cityText(city)})}
      else setLocalError('PIN detected, but its city needs mapping. Choose a listed city or contact support.')
    }catch(e){
      if(requestId===seq.current)setLocalError(e.message||'Unable to detect the project location.')
    }finally{if(requestId===seq.current)setPinBusy(false)}
  }
  function setCity(text){
    setCitySearch(text)
    const city=exactCity(text)
    update({cityId:city?String(city.id):'',cityName:text})
  }
  function setFlow(flowKey){
    update({flowKey,projectType:'',floors:'',plotArea:'',propertyType:'',bhk:'',propertyIntent:'',budget:''})
  }
  function submit(event){
    event.preventDefault()
    const city=exactCity(citySearch)
    if(!/^\d{6}$/.test(value.pincode))return setLocalError('Enter a valid 6-digit PIN code.')
    if(!city&&!value.cityId)return setLocalError('Select a valid City / Location.')
    if(!value.flowKey)return setLocalError('Select what you are looking for.')
    if(value.flowKey==='build'&&(!value.projectType||!value.floors))return setLocalError('Choose your project type and floors.')
    if(value.flowKey==='design'&&!value.propertyType)return setLocalError('Choose your property type.')
    if(value.flowKey==='property'&&(!value.propertyIntent||!value.propertyType))return setLocalError('Choose your property intent and type.')
    if(String(value.name||'').trim().length<2)return setLocalError('Enter your name.')
    if(!/^[6-9]\d{9}$/.test(digits(value.phone)))return setLocalError('Enter a valid 10-digit mobile number.')
    if(!value.consent)return setLocalError('Confirm sharing your enquiry with the selected professional.')
    onSubmit(event)
  }

  return <form className="pcf-form" onSubmit={submit}>
    <div className="pcf-two">
      <label><span>PIN Code {pinBusy&&<small>Detecting…</small>}</span><input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="6-digit PIN" value={value.pincode} onChange={e=>updatePin(e.target.value)}/></label>
      <label><span>City / Location</span><input required list={cityListId} autoComplete="address-level2" disabled={loadingCities} placeholder={loadingCities?'Loading cities…':'Type city name'} value={citySearch} onChange={e=>setCity(e.target.value)} onBlur={()=>{const city=exactCity(citySearch);if(city){setCitySearch(cityText(city));update({cityId:String(city.id),cityName:cityText(city)})}}}/><datalist id={cityListId}>{cityList.map(city=><option key={city.id} value={cityText(city)}/>)}</datalist></label>
    </div>
    {detected&&<p className="pcf-detected">⌖ {detected}</p>}
    <label><span>I am looking for</span><select required value={value.flowKey} onChange={e=>setFlow(e.target.value)}><option value="">Select requirement</option><option value="build">Home Construction</option><option value="design">Interior Design</option><option value="property">Real Estate</option></select></label>

    {value.flowKey==='build'&&<div className="pcf-two pcf-options">
      <label><span>Project Type</span><select required value={value.projectType} onChange={e=>update({projectType:e.target.value})}><option value="">Select project</option><option value="residential">Residential</option><option value="commercial">Commercial</option><option value="renovation">Renovation</option><option value="extension">Extension</option></select></label>
      <label><span>No. of Floors</span><select required value={value.floors} onChange={e=>update({floors:e.target.value})}><option value="">Select floors</option>{FLOORS.map(([key,text])=><option key={key} value={key}>{text}</option>)}</select></label>
      <label><span>Plot Area <small>Optional</small></span><div className="pcf-unit"><input type="number" min="10" placeholder="e.g. 200" value={value.plotArea} onChange={e=>update({plotArea:e.target.value})}/><i>sq yards</i></div></label>
    </div>}
    {value.flowKey==='design'&&<div className="pcf-two pcf-options">
      <label><span>Property Type</span><select required value={value.propertyType} onChange={e=>update({propertyType:e.target.value,bhk:''})}><option value="">Select property</option><option value="apartment">Apartment</option><option value="villa">Villa</option><option value="independent_house">Independent House</option><option value="office">Office</option><option value="commercial_space">Commercial Space</option></select></label>
      {!['office','commercial_space'].includes(value.propertyType)&&<label><span>BHK <small>Optional</small></span><select value={value.bhk} onChange={e=>update({bhk:e.target.value})}><option value="">Select BHK</option><option value="1bhk">1 BHK</option><option value="2bhk">2 BHK</option><option value="3bhk">3 BHK</option><option value="4bhk">4 BHK</option><option value="5plus">5+ BHK</option></select></label>}
    </div>}
    {value.flowKey==='property'&&<div className="pcf-two pcf-options">
      <label><span>I want to</span><select required value={value.propertyIntent} onChange={e=>update({propertyIntent:e.target.value})}><option value="">Select intent</option><option value="buy">Buy</option><option value="sell">Sell</option></select></label>
      <label><span>Property Type</span><select required value={value.propertyType} onChange={e=>update({propertyType:e.target.value})}><option value="">Select property</option><option value="apartment">Apartment</option><option value="villa">Villa</option><option value="independent_house">Independent House</option><option value="commercial">Commercial</option><option value="plot">Plot / Land</option></select></label>
      <label><span>Budget <small>Optional</small></span><select value={value.budget} onChange={e=>update({budget:e.target.value})}><option value="">Select budget</option>{['Under ₹20 Lakhs','₹20 - 50 Lakhs','₹50 Lakhs - 1 Crore','₹1 - 2 Crore','Above ₹2 Crore'].map(item=><option key={item} value={item}>{item}</option>)}</select></label>
    </div>}
    <div className="pcf-two">
      <label><span>Your Name</span><input required maxLength={160} autoComplete="name" placeholder="Enter your name" value={value.name} onChange={e=>update({name:e.target.value})}/></label>
      <label><span>Mobile Number</span><div className="pcf-phone"><i>+91</i><input required inputMode="tel" autoComplete="tel-national" placeholder="10-digit mobile" minLength={10} maxLength={10} pattern="[6-9][0-9]{9}" value={value.phone} onChange={e=>update({phone:digits(e.target.value).slice(0,10)})}/></div></label>
    </div>
    <label><span>Additional Information <small>Optional</small></span><textarea rows={3} maxLength={1000} value={value.message} onChange={e=>update({message:e.target.value})} placeholder="Locality, rooms, materials, parking, preferred package or anything important…"/></label>
    <label className="pcf-consent"><input type="checkbox" required checked={value.consent} onChange={e=>update({consent:e.target.checked})}/><span>I agree that ProPulse may share this request with the selected professional after acceptance. My contact details stay protected until payment or eligible membership acceptance.</span></label>
    <input className="pcf-honeypot" tabIndex={-1} aria-hidden="true" autoComplete="off" value={value.website} onChange={e=>update({website:e.target.value})}/>
    {(error||localError)&&<p className="pcf-error" role="alert">{error||localError}</p>}
    <button className="pcf-submit" type="submit" disabled={busy||pinBusy}>{busy?'Sending…':submitLabel}<span aria-hidden="true"> →</span></button>
  </form>
}
