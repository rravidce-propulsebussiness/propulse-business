// Shared by the service picker and its regression tests.
// The persisted profile API stores one row per service (not an "all" sentinel).
export const ALL_SERVICES_VALUE='__all_services__'

export function selectAllIndustryServices(rows, catalog, rowIndex){
  const row=rows[rowIndex]
  if(!row?.industryId)return rows
  const industryId=String(row.industryId)
  const available=catalog.filter(item=>String(item.industry_id)===industryId)
  if(!available.length)return rows

  const existing=new Set(rows.filter(item=>String(item.industryId)===industryId&&item.serviceId)
    .map(item=>String(item.serviceId)))
  const missing=available.filter(item=>!existing.has(String(item.id)))
  // If the user starts from a blank service row, fill that row instead of
  // appending everything and leaving an invalid placeholder that blocks Save.
  const fillBlank=!row.serviceId
  const next=rows.slice()
  if(fillBlank){
    if(missing.length){
      const first=missing.shift()
      next[rowIndex]={...row,serviceId:String(first.id),subserviceId:''}
    }else{
      // Every catalog service is already listed elsewhere.
      next.splice(rowIndex,1)
    }
  }
  return [...next,...missing.map(item=>({
    industryId,serviceId:String(item.id),subserviceId:''
  }))]
}
