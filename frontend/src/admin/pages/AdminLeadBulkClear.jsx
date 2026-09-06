import {useEffect} from 'react';
import {authRequest} from '../../utils/auth';
import './AdminLeadBulkClear.css';

const clean=v=>String(v??'').trim();

function currentScope(){
  const bar=document.querySelector('.v9-filterbar');
  if(!bar)return {count:0,filtered:false,description:'all leads'};
  const search=clean(bar.querySelector('.v9-filter-search input')?.value);
  const selects=[...bar.querySelectorAll(':scope > select')];
  const selectedLabels=selects.map(select=>clean(select.options?.[select.selectedIndex]?.textContent)).filter(label=>label&&!/^all /i.test(label));
  const tier=clean(bar.querySelector('.v9-tier-filters button.active')?.textContent);
  if(tier&&tier.toLowerCase()!=='all')selectedLabels.push(tier);
  const filtered=Boolean(search||selectedLabels.length);
  const parts=[];
  if(search)parts.push(`search: “${search}”`);
  parts.push(...selectedLabels);
  return{count:document.querySelectorAll('.v9-grid .v9-card').length,filtered,description:filtered?parts.join(' · '):'all leads'};
}

function visibleLeadIds(){return[...document.querySelectorAll('.v9-grid .v9-card')].map(card=>clean(card.querySelector('.v9-main small')?.textContent).match(/LEAD\s*#(\d+)/i)?.[1]).filter(Boolean)}

export default function AdminLeadBulkClear(){
 useEffect(()=>{
  let disposed=false,button=null,timer=null;
  const update=()=>{if(!button)return;const scope=currentScope();button.hidden=scope.count===0;button.disabled=scope.count===0||button.dataset.busy==='true';const nextText=scope.filtered?`Clear ${scope.count} matching leads`:`Clear all ${scope.count} leads`;if(button.textContent!==nextText)button.textContent=nextText;button.title=scope.filtered?`Permanently delete the ${scope.count} leads currently matching: ${scope.description}`:'Permanently delete every lead in the inventory'};
  const refreshLeads=()=>{const refresh=[...document.querySelectorAll('.v9-panel-head button')].find(x=>/refresh/i.test(x.textContent));if(refresh&&!refresh.disabled)refresh.click()};
  const setup=()=>{if(disposed)return;const bar=document.querySelector('.v9-filterbar');if(!bar)return;if(!button||!bar.contains(button)){button=document.createElement('button');button.type='button';button.className='v9-filter-clear v9-bulk-clear';button.setAttribute('data-v9-bulk-clear','true');button.addEventListener('click',async()=>{if(button.dataset.busy==='true')return;const scope=currentScope(),ids=visibleLeadIds();if(!ids.length)return;const action=scope.filtered?`matching ${scope.description}`:'ALL leads';if(!window.confirm(`Permanently delete ${ids.length} ${action}?\n\nThis cannot be undone.`))return;button.dataset.busy='true';update();let deleted=0;const failed=[];try{for(const id of ids){try{await authRequest(`/leads/${id}`,{method:'DELETE'});deleted++}catch(error){failed.push(`${id}: ${error.message}`)}}refreshLeads();if(failed.length)window.alert(`${deleted} lead(s) deleted. ${failed.length} failed.\n\n${failed.join('\n')}`);else window.alert(`${deleted} lead(s) deleted successfully.`)}finally{button.dataset.busy='false';update()}});bar.appendChild(button)}update();if(!bar.dataset.bulkClearListeners){bar.addEventListener('input',update);bar.addEventListener('change',update);bar.addEventListener('click',()=>setTimeout(update,0));bar.dataset.bulkClearListeners='true'}};
  const onSync=()=>setTimeout(refreshLeads,250);
  window.addEventListener('propulse:leads-refresh',onSync);
  setup();timer=setInterval(setup,500);
  return()=>{disposed=true;window.removeEventListener('propulse:leads-refresh',onSync);if(timer)clearInterval(timer);if(button?.parentNode)button.parentNode.removeChild(button)};
 },[]);
 return null;
}
