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
  await page.getByRole('button',{name:/sign in/i}).click()
}

test('protected customer route redirects anonymous users to login',async({page})=>{
  await page.goto('/wallet')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('button',{name:/sign in/i})).toBeVisible()
})

test('business login survives reload and cannot access Admin APIs',async({page})=>{
  await login(page,accounts.business)
  await expect(page).toHaveURL(/\/leads(?:\?|$)/)
  await expect(page.getByRole('heading',{name:/available leads/i})).toBeVisible()

  await page.reload()
  await expect(page).toHaveURL(/\/leads(?:\?|$)/)

  await page.goto('/wallet')
  await expect(page.getByText('AVAILABLE BALANCE')).toBeVisible()
  await expect(page.getByText('₹2,500.00')).toBeVisible()

  const status=await page.evaluate(async()=>{
    const response=await fetch('/api/admin/system-health',{credentials:'include'})
    return response.status
  })
  expect(status).toBe(403)
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
