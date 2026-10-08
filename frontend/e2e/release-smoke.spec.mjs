import {test,expect} from '@playwright/test'

const PASSWORD='E2ePass123!'
const accounts={
  admin:'e2e-admin@propulse.test',
  business:'e2e-business@propulse.test',
  partner:'e2e-partner@propulse.test'
}

async function login(page,email){
  await page.goto('/login')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  const loginResponse=page.waitForResponse(response=>
    response.url().includes('/api/auth/login')&&response.request().method()==='POST'
  )
  await page.getByRole('button',{name:/sign in/i}).click()
  const response=await loginResponse
  expect(response.ok()).toBe(true)
  await page.waitForURL(url=>url.pathname!=='/login')
}

async function api(page,path,{method='GET',body,idempotencyKey}={}){
  return page.evaluate(async({path,method,body,idempotencyKey})=>{
    const headers={}
    if(body!==undefined)headers['Content-Type']='application/json'
    if(idempotencyKey)headers['Idempotency-Key']=idempotencyKey
    const response=await fetch(path,{
      method,
      credentials:'include',
      headers:Object.keys(headers).length?headers:undefined,
      body:body===undefined?undefined:JSON.stringify(body)
    })
    let payload=null
    try{payload=await response.json()}catch{}
    return{status:response.status,body:payload}
  },{path,method,body,idempotencyKey})
}

async function logout(page){
  await api(page,'/api/auth/logout',{method:'POST'})
}

async function findFixtureLead(page,requirement){
  const result=await api(page,`/api/leads?status=available&search=${encodeURIComponent(requirement)}&limit=20`)
  expect(result.status).toBe(200)
  const items=Array.isArray(result.body)?result.body:(result.body?.items||[])
  return items.find(item=>String(item.requirement||'')===requirement)
}

const TINY_PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6S0sAAAAASUVORK5CYII='

test('public homepage presents homeowner acquisition journeys',async({page})=>{
  await page.goto('/')
  const visualHero=page.locator('#home .pp-art')
  await expect(visualHero).toBeVisible()
  await expect(visualHero.locator('svg')).toHaveAttribute('aria-label','Animated plot, construction, completed house and furnished interior')
  await expect(visualHero.locator('.pp-plot')).toHaveCount(1)
  await expect(visualHero.locator('.pp-build')).toHaveCount(1)
  await expect(visualHero.locator('.pp-facade')).toHaveCount(1)
  await expect(visualHero.locator('.pp-interior')).toHaveCount(1)
  const stageTabs=page.getByRole('tablist',{name:'Project journey'})
  await expect(stageTabs.getByRole('tab')).toHaveCount(4)
  await stageTabs.getByRole('tab',{name:'Interior'}).click()
  await expect(visualHero).toHaveAttribute('data-p','3')
  await expect(stageTabs.getByRole('tab',{name:'Interior'})).toHaveAttribute('aria-selected','true')
  await expect(page.getByRole('link',{name:/view packages/i}).first()).toHaveAttribute('href','/packages')
  await expect(page.getByRole('link',{name:/get free quote/i}).first()).toHaveAttribute('href','/quote#interiors')
  await expect(page.getByRole('link',{name:/find professionals/i}).first()).toHaveAttribute('href','/experts')
  await expect(page.getByRole('link',{name:/for professionals/i}).first()).toHaveAttribute('href','/professionals')
  await expect(page.getByRole('heading',{name:/what do you need/i})).toBeVisible()
  await expect(page.getByRole('heading',{name:'Build Your Home'})).toBeVisible()
  await expect(page.getByRole('heading',{name:'Design Your Space'})).toBeVisible()
  await expect(page.getByRole('heading',{name:'Find a Property'})).toBeVisible()
  await expect(page.getByRole('button',{name:'Start Your Requirement'})).toBeVisible()

  await page.getByRole('button',{name:'Start Build Your Home'}).click()
  await expect(page.getByText('Tell Us Your Requirement',{exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:/submit requirement/i})).toBeVisible()
})

test('protected customer route redirects anonymous users to login',async({page})=>{
  await page.goto('/wallet')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('button',{name:/sign in/i})).toBeVisible()
})

test('professional Requests CRM separates callbacks from Available Leads and filters stages',async({page})=>{
  await login(page,accounts.business)
  await page.route('**/api/profile/project-callbacks',route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({data:[
      {id:71,project_id:123,project_title:'Hyderabad 3BHK',customer_name:'Test Customer',
        customer_phone:'••••••••23',customer_email:'t***@e***.com',status:'new',
        message:'Need a callback to discuss project plans',created_at:'2026-10-08T08:00:00Z'},
      {id:72,project_id:null,project_title:'Profile enquiry',customer_name:'Second Customer',
        customer_phone:'••••••••45',status:'contacted',message:'Need an estimate',
        created_at:'2026-10-07T08:00:00Z'}
    ]})
  }))
  await page.route('**/api/profile/project-quote-requests',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify({data:[]})
  }))
  await page.goto('/professionals')
  await expect(page.getByRole('link',{name:'Requests',exact:true})).toBeVisible()
  await expect(page.getByRole('heading',{name:'Callback Requests'})).toHaveCount(0)
  await page.getByRole('link',{name:'Requests',exact:true}).click()
  await expect(page).toHaveURL(/\/professional-requests$/)
  await expect(page.getByRole('heading',{name:'Requests Inbox'})).toBeVisible()
  await expect(page.locator('.prc-request-item .prc-request-project').getByText('Hyderabad 3BHK')).toBeVisible()
  await expect(page.locator('.prc-request-item')).toHaveCount(2)
  await page.getByRole('group',{name:'Filter by request status'}).getByRole('button',{name:/In follow-up/}).click()
  await expect(page.locator('.prc-request-item')).toHaveCount(1)
  await expect(page.locator('.prc-request-item').getByText('Second Customer')).toBeVisible()
  await page.getByRole('button',{name:/All requests/}).click()
  await page.getByRole('searchbox',{name:'Search callback requests'}).fill('Hyderabad')
  await expect(page.locator('.prc-request-item')).toHaveCount(1)
  await expect(page.getByText('Need a callback to discuss project plans')).toBeVisible()
  await expect(page.getByText('••••••••23')).toBeVisible()
  await page.getByRole('tab',{name:/Quotation requests/}).click()
  await expect(page.getByRole('heading',{name:'Professional Quote Requests'})).toBeVisible()
  await expect(page.locator('.prc-summary-card')).toHaveCount(4)
  await expect(page.locator('.prc-heading')).toHaveCSS('border-radius', /\d+px/)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('.prc-summary-card').first()).toHaveCSS('animation-name', 'none')
  await expect(page.locator('.prc-hero-orb-one')).toHaveCSS('animation-name', 'none')
})

test('business login survives reload and cannot access Admin APIs',async({page})=>{
  await login(page,accounts.business)
  await expect(page).toHaveURL(/\/professionals(?:\?|$)/)
  await expect(page.getByRole('heading',{name:'Find the right opportunity for your business.'})).toBeVisible()

  await page.reload()
  await expect(page).toHaveURL(/\/professionals(?:\?|$)/)

  await page.goto('/wallet')
  await expect(page.getByText('AVAILABLE BALANCE')).toBeVisible()
  await expect(page.locator('.wallet-summary-card.balance').getByText('₹2,500.00',{exact:true})).toBeVisible()

  const status=await page.evaluate(async()=>{
    const response=await fetch('/api/admin/system-health',{credentials:'include'})
    return response.status
  })
  expect(status).toBe(403)
})

test.describe('financial mutation release gate',()=>{
  test.describe.configure({retries:0})

  test('financial mutations remain exactly-once across wallet and manual approvals',async({page})=>{
    await login(page,accounts.business)
    await expect(page).toHaveURL(/\/professionals(?:\?|$)/)

    const startingWallet=await api(page,'/api/wallet?summary=1')
    expect(startingWallet.status).toBe(200)
    expect(Number(startingWallet.body?.balance)).toBe(2500)

    const walletLead=await findFixtureLead(page,'E2E Financial Wallet Purchase')
    expect(walletLead?.id).toBeTruthy()

    const purchaseKey='e2e-lead-purchase-'+Date.now()
    const firstPurchase=await api(page,`/api/leads/${walletLead.id}/purchase`,{
      method:'POST',
      idempotencyKey:purchaseKey,
      body:{shares:1,useWallet:true}
    })
    expect(firstPurchase.status).toBe(201)
    expect(firstPurchase.body?.status).toBe('paid')
    expect(Number(firstPurchase.body?.wallet_amount)).toBe(500)
    expect(Number(firstPurchase.body?.external_amount)).toBe(0)
    expect(Number(firstPurchase.body?.balance_after)).toBe(2000)

    const replayedPurchase=await api(page,`/api/leads/${walletLead.id}/purchase`,{
      method:'POST',
      idempotencyKey:purchaseKey,
      body:{shares:1,useWallet:true}
    })
    expect(replayedPurchase.status).toBe(201)
    expect(Number(replayedPurchase.body?.id)).toBe(Number(firstPurchase.body?.id))

    const duplicatePurchase=await api(page,`/api/leads/${walletLead.id}/purchase`,{
      method:'POST',
      idempotencyKey:'e2e-lead-purchase-business-'+Date.now(),
      body:{shares:1,useWallet:true}
    })
    expect(duplicatePurchase.status).toBe(201)
    expect(duplicatePurchase.body?.alreadyPurchased).toBe(true)

    const afterPurchaseWallet=await api(page,'/api/wallet')
    expect(afterPurchaseWallet.status).toBe(200)
    expect(Number(afterPurchaseWallet.body?.balance)).toBe(2000)
    const walletDebits=(afterPurchaseWallet.body?.transactions||[]).filter(item=>
      item.type==='debit'&&Number(item.payment_id)===Number(firstPurchase.body?.payment_id)
    )
    expect(walletDebits).toHaveLength(1)
    expect(Number(walletDebits[0]?.amount)).toBe(500)

    const topupReference='E2E-TOPUP-'+Date.now()
    const topupKey='e2e-wallet-topup-'+Date.now()
    const topup=await api(page,'/api/wallet/topups',{
      method:'POST',
      idempotencyKey:topupKey,
      body:{amount:700,reference:topupReference}
    })
    expect(topup.status).toBe(201)
    expect(topup.body?.status).toBe('pending')

    const replayedTopup=await api(page,'/api/wallet/topups',{
      method:'POST',
      idempotencyKey:topupKey,
      body:{amount:700,reference:topupReference}
    })
    expect(replayedTopup.status).toBe(201)
    expect(Number(replayedTopup.body?.id)).toBe(Number(topup.body?.id))

    const duplicateTopup=await api(page,'/api/wallet/topups',{
      method:'POST',
      idempotencyKey:'e2e-wallet-topup-business-'+Date.now(),
      body:{amount:700,reference:topupReference}
    })
    expect(duplicateTopup.status).toBe(400)
    expect(duplicateTopup.body?.code).toBe('DUPLICATE_REFERENCE')

    const manualLead=await findFixtureLead(page,'E2E Financial Manual Approval')
    expect(manualLead?.id).toBeTruthy()

    const manualPurchase=await api(page,`/api/leads/${manualLead.id}/purchase`,{
      method:'POST',
      idempotencyKey:'e2e-lead-manual-'+Date.now(),
      body:{shares:1,useWallet:false}
    })
    expect(manualPurchase.status).toBe(201)
    expect(manualPurchase.body?.status).toBe('pending_payment')
    expect(manualPurchase.body?.requires_external_payment).toBe(true)
    expect(Number(manualPurchase.body?.external_amount)).toBe(300)
    const manualPaymentId=Number(manualPurchase.body?.payment_id)
    expect(manualPaymentId).toBeGreaterThan(0)

    const proofReference='E2E-MANUAL-'+Date.now()
    const proof=await api(page,`/api/payments/${manualPaymentId}/reference`,{
      method:'POST',
      body:{manualReference:proofReference,proofUrl:TINY_PNG,notes:'Release E2E manual payment'}
    })
    expect(proof.status).toBe(200)
    expect(proof.body?.manual_reference).toBe(proofReference)

    await logout(page)
    await login(page,accounts.admin)
    await expect(page).toHaveURL(/\/admin$/)

    const approveTopup=await api(page,`/api/wallet/topups/${topup.body.id}/approve`,{method:'PATCH',body:{}})
    expect(approveTopup.status).toBe(200)
    expect(approveTopup.body?.status).toBe('approved')

    const approveTopupAgain=await api(page,`/api/wallet/topups/${topup.body.id}/approve`,{method:'PATCH',body:{}})
    expect(approveTopupAgain.status).toBe(409)
    expect(approveTopupAgain.body?.code).toBe('ALREADY_REVIEWED')

    const approveManual=await api(page,`/api/payments/${manualPaymentId}/status`,{
      method:'PATCH',
      body:{status:'paid',notes:'Approved by release E2E'}
    })
    expect(approveManual.status).toBe(200)
    expect(approveManual.body?.status).toBe('paid')
    expect(approveManual.body?.lead_purchase?.status).toBe('paid')

    const approveManualAgain=await api(page,`/api/payments/${manualPaymentId}/status`,{
      method:'PATCH',
      body:{status:'paid',notes:'Duplicate approval attempt'}
    })
    expect(approveManualAgain.status).toBe(400)
    expect(approveManualAgain.body?.code).toBe('PAYMENT_ALREADY_PAID')

    const integrity=await api(page,'/api/admin/financial-integrity?refresh=1')
    expect(integrity.status).toBe(200)
    for(const type of ['wallet_balance','approved_topup','payment_split','payment_wallet_debit']){
      const check=(integrity.body?.checks||[]).find(item=>item.type===type)
      expect(check?.count).toBe(0)
    }

    await logout(page)
    await login(page,accounts.business)
    const finalWallet=await api(page,'/api/wallet')
    expect(finalWallet.status).toBe(200)
    expect(Number(finalWallet.body?.balance)).toBe(2700)

    const topupCredits=(finalWallet.body?.transactions||[]).filter(item=>
      item.type==='credit'&&item.reference_type==='wallet_topup'&&Number(item.reference_id)===Number(topup.body.id)
    )
    expect(topupCredits).toHaveLength(1)
    expect(Number(topupCredits[0]?.amount)).toBe(700)

    const finalWalletDebits=(finalWallet.body?.transactions||[]).filter(item=>
      item.type==='debit'&&Number(item.payment_id)===Number(firstPurchase.body?.payment_id)
    )
    expect(finalWalletDebits).toHaveLength(1)

    const purchases=await api(page,'/api/leads/purchased')
    expect(purchases.status).toBe(200)
    const rows=Array.isArray(purchases.body)?purchases.body:(purchases.body?.items||[])
    expect(rows.filter(item=>Number(item.lead_id)===Number(walletLead.id))).toHaveLength(1)
    expect(rows.filter(item=>Number(item.lead_id)===Number(manualLead.id))).toHaveLength(1)
  })
})

test('Admin login reaches operations consoles and session survives reload',async({page})=>{
  await login(page,accounts.admin)
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('heading',{name:'Overview'})).toBeVisible()

  await page.goto('/admin/system-health')
  await expect(page.getByRole('heading',{name:'System health'})).toBeVisible()
  await expect(page.getByText('Background worker')).toBeVisible()

  await page.goto('/admin/financial-integrity')
  await expect(page.getByRole('heading',{name:'Financial integrity'})).toBeVisible()
  await expect(page.getByRole('button',{name:/run fresh reconciliation/i})).toBeVisible()

  await page.reload()
  await expect(page).toHaveURL(/\/admin\/financial-integrity$/)
  await expect(page.getByRole('heading',{name:'Financial integrity'})).toBeVisible()
})

test('active Lead Partner reaches dashboard and separated inventory workspaces',async({page})=>{
  await login(page,accounts.partner)
  await expect(page).toHaveURL(/\/lead-partner\/dashboard$/)
  await expect(page.getByText('Active partner')).toBeVisible()

  await page.goto('/lead-partner/inventory')
  await expect(page.getByRole('heading',{name:'Lead inventory'})).toBeVisible()
  await expect(page.getByRole('button',{name:/my leads/i})).toBeVisible()
  await expect(page.getByRole('button',{name:/upload leads/i})).toBeVisible()
  await expect(page.getByRole('button',{name:/google sheets/i})).toBeVisible()

  await page.reload()
  await expect(page).toHaveURL(/\/lead-partner\/inventory$/)

  const status=await page.evaluate(async()=>{
    const response=await fetch('/api/admin/financial-integrity',{credentials:'include'})
    return response.status
  })
  expect(status).toBe(403)
})

test('contact page shows direct channels without duplicated marketing panels',async({page})=>{
  await page.route('**/api/contact?audience=website',route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({
      email:'hello@example.com',
      phone:'+91 98765 43210',
      whatsapp:'+91 98765 43210',
      address:'Hyderabad, Telangana',
      business_hours:'Mon–Sat, 9 AM–6 PM',
      social_handles:[]
    })
  }))
  await page.goto('/contact')
  await expect(page.getByRole('heading',{name:'We’re here to help.'})).toBeVisible()
  await expect(page.locator('.contact-methods a[href="tel:+919876543210"]')).toBeVisible()
  await expect(page.locator('.contact-methods a[href="mailto:hello@example.com"]')).toBeVisible()
  await expect(page.locator('.contact-methods a[href="https://wa.me/919876543210"]')).toBeVisible()
  await expect(page.locator('.contact-service-strip,.contact-map,.contact-direct-links')).toHaveCount(0)
  await expect(page.getByRole('button',{name:/Get Free Quote/})).toBeVisible()
})

test('project cards open dedicated detail pages using the keyboard',async({page})=>{
  const project={
    project_id:123,project_type:'construction',title:'Modern Villa',
    description:'Completed residential project',business_name:'Sample Engineer'
  }
  await page.route('**/api/experts/projects?*',route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({data:[project],pagination:{hasNextPage:false}})
  }))
  await page.route('**/api/experts/projects/123',route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify(project)
  }))
  await page.goto('/projects')
  const card=page.getByRole('link',{name:'View details for Modern Villa',exact:true})
  await expect(card).toBeVisible()
  await card.focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/projects\/project-123$/)
  await expect(page.getByRole('heading',{name:'Modern Villa',exact:true})).toBeVisible()
  await expect(page.locator('.pjd-information,.pjd-back-row')).toHaveCount(0)
  await expect(page.getByRole('button',{name:/Download Package/})).toBeVisible()
  await expect(page.getByRole('button',{name:/Request a Callback/})).toBeVisible()
  await page.getByRole('navigation',{name:'Breadcrumb'}).getByRole('link',{name:'Completed Projects'}).click()
  await expect(page).toHaveURL(/\/projects\/?$/)
  await expect(card).toBeVisible()
})


test('retired stock-photo concept links return to the completed projects gallery',async({page})=>{
  await page.route('**/api/experts/projects?*',route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({data:[],pagination:{hasNextPage:false}})
  }))
  await page.goto('/projects/sample-courtyard')
  await expect(page).toHaveURL(/\/projects\/?$/)
  await expect(page.locator('.pj-completed-heading h1')).toHaveText('Completed Projects')
  await expect(page.getByText('The Courtyard Residence')).toHaveCount(0)
  await expect(page.getByRole('heading',{name:'Completed projects are coming soon'})).toBeVisible()
})

test('published project retains private project-specific callback flow alongside Get Quote',async({page})=>{
  const project={
    project_id:123,project_type:'construction',title:'Modern Villa',
    description:'Completed residential project',completion_year:2024,business_name:'Sample Engineer',
    business_profile_id:7,location_text:'Hyderabad',
    image_urls:[],is_verified:true,
  }
  await page.route('**/api/experts/projects/123',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify(project)
  }))
  let submitted=null
  await page.route('**/api/experts/projects/123/callback',async route=>{
    submitted=route.request().postDataJSON()
    await route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({success:true})})
  })
  await page.goto('/projects/project-123')
  await expect(page.getByRole('heading',{name:'Modern Villa'})).toBeVisible()
  const actions=page.locator('.pjd-action-stack')
  await expect(actions.getByRole('button',{name:/Download Package/})).toBeVisible()
  await expect(actions.getByRole('link',{name:/Get Quote/})).toBeVisible()
  const [download]=await Promise.all([
    page.waitForEvent('download'),
    actions.getByRole('button',{name:/Download Package/}).click()
  ])
  expect(download.suggestedFilename()).toMatch(/^propulse-123-package-guide\.pdf$/)
  await actions.getByRole('button',{name:/Request a Callback/}).click()
  const dialog=page.getByRole('dialog',{name:'Request a Callback'})
  await expect(dialog).toBeVisible()
  await expect(page.locator('.pjd-information')).toHaveCount(1)
  await expect(page.locator('.pjd-bottom-grid,.pjd-related-grid')).toHaveCount(0)

  const form=page.locator('.pjd-callback-form')
  await expect(form).toBeVisible()
  await form.getByPlaceholder('Full name').fill('Example Customer')
  await form.getByPlaceholder('10-digit mobile').fill('9876543210')
  await form.getByRole('checkbox').check()
  await form.getByRole('button',{name:/Send Callback Request/}).click()
  await expect(dialog.getByRole('status').filter({hasText:/Callback request received/})).toBeVisible()
  expect(submitted).toMatchObject({name:'Example Customer',phone:'9876543210',consent:true})
  await dialog.getByRole('button',{name:'Done'}).click()
  await actions.getByRole('link',{name:/Get Quote/}).click()
  await expect(page).toHaveURL(/\/projects\/project-123\/quote$/)
})


test('professional interior quote reuses the exact interiors wizard with no custom package',async({page})=>{
  const project={
    project_id:123,project_type:'interior',title:'3 BHK Interior',
    description:'Three-bedroom interiors',completion_year:2025,
    business_name:'Example Studio',business_profile_id:7,
    location_text:'Uppal',area_text:'1700',budget_text:'18 Lakhs',
    package_name:'Standard',image_urls:[],
  }
  const professional={
    business_name:'Example Studio',business_profile_id:7,
    service_plans:[
      {id:2,title:'Standard',industry:'design',description:'Interior execution',price_from:1600,price_unit:'sqft',
       duration_label:'8–10 weeks',inclusions:['Branded plywood','Modular kitchen']},
      {id:3,title:'Premium',industry:'design',description:'Premium interiors',price_from:2400,price_unit:'sqft',
       inclusions:['Premium hardware']},
    ],
  }
  const flow={
    flowType:'requirement',flowToken:'e2e-professional-design',
    questions:[
      {questionKey:'property_type',questionType:'single_select',label:'Property Type',isRequired:true,
       options:[{value:'residential',label:'Residential'}]},
      {questionKey:'bhk',questionType:'single_select',label:'Bedrooms',isRequired:true,
       options:[{value:'3_bhk',label:'3 BHK'}]},
      {questionKey:'interior_scope',questionType:'single_select',label:'Interior Scope',isRequired:true,
       options:[{value:'end_to_end',label:'Full Home Interiors'},{value:'selected_work',label:'Selected Work'}]},
      {questionKey:'finish_quality',questionType:'single_select',label:'Interior Package',isRequired:true,
       options:[{value:'standard',label:'Standard'},{value:'premium',label:'Premium'}]},
      {questionKey:'additional_requirement',questionType:'text',label:'Additional Requirement',isRequired:false},
    ],
  }
  await page.route('**/api/customer-flows/design',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify(flow),
  }))
  await page.route('**/api/experts/projects/123',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify(project),
  }))
  await page.route('**/api/experts/7',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify(professional),
  }))
  let submitted=null
  await page.route('**/api/experts/projects/123/quote-request',async route=>{
    submitted=route.request().postDataJSON()
    await route.fulfill({
      status:201,contentType:'application/json',
      body:JSON.stringify({accepted:true,requestId:83}),
    })
  })
  await page.goto('/projects/project-123/quote')
  await expect(page.getByRole('heading',{name:'3 BHK Interior'})).toBeVisible()
  await expect(page.locator('.quote-flow-interiors .irx-page')).toBeVisible()
  await expect(page.getByRole('heading',{name:'Basic Details'})).toBeVisible()
  await expect(page.getByRole('heading',{name:'Property Details'})).toBeVisible()
  await expect(page.getByRole('heading',{name:'Interior Requirements'})).toBeVisible()
  await expect(page.locator('.irx-package-grid>button')).toHaveCount(2)
  await expect(page.locator('.irx-package-grid')).toContainText('₹1,600 / sq ft')
  await expect(page.locator('.irx-package-grid')).toContainText('₹2,400 / sq ft')
  await expect(page.locator('.irx-package-grid')).not.toContainText('Custom quotation')
  await expect(page.locator('.irx-summary-card')).toContainText('Standard')
  await page.getByPlaceholder('Enter your full name').fill('Example Customer')
  await page.getByPlaceholder('Enter 10-digit number').fill('9876543210')
  await page.locator('#irx-property select').first().selectOption('residential')
  await page.locator('#irx-property select').nth(1).selectOption('3_bhk')
  await page.locator('.irx-scope-cards').getByRole('button',{name:/Full Home Interiors/}).click()
  await page.locator('.irx-summary-card button[type=submit]').click()
  await expect(page.getByRole('heading',{name:'Quotation request received'})).toBeVisible()
  await expect(page.getByText('Reference #83')).toBeVisible()
  expect(submitted).toMatchObject({
    name:'Example Customer',phone:'9876543210',
    consent:true,preferredPackage:'Standard',
  })
  expect(submitted.requirement).toContain('Reference project: 3 BHK Interior')
  expect(submitted.requirement).toContain('Interior Scope: Full Home Interiors')
  expect(submitted).not.toHaveProperty('quoted_price')
  expect(submitted).not.toHaveProperty('package_price_from_snapshot')
})

test('interior project quote requires a published professional package',async({page})=>{
  await page.route('**/api/customer-flows/design',route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({flowType:'requirement',flowToken:'e2e-no-packages',questions:[]}),
  }))
  await page.route('**/api/experts/projects/124',route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({
      project_id:124,title:'Completed Apartment Interior',
      project_type:'interior',completion_year:2025,business_profile_id:8,
    }),
  }))
  await page.route('**/api/experts/8',route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({business_name:'Professional 8',service_plans:[]}),
  }))
  await page.goto('/projects/project-124/quote')
  await expect(page.locator('.irx-package-grid>button')).toHaveCount(0)
  await expect(page.getByText(/has not published a .* package yet/).first()).toBeVisible()
  await expect(page.getByRole('heading',{name:'Matching professional package unavailable'})).toBeVisible()
  await expect(page.locator('.irx-summary-card button[type=submit]')).toHaveCount(0)
  await expect(page.getByText('Custom quotation',{exact:true})).toHaveCount(0)
})
