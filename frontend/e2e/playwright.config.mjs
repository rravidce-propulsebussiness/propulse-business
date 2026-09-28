import {defineConfig} from '@playwright/test'

export default defineConfig({
  testDir:'.',
  testMatch:'release-smoke.spec.mjs',
  timeout:30000,
  expect:{timeout:10000},
  fullyParallel:false,
  retries:1,
  workers:1,
  reporter:[['line'],['html',{outputFolder:'playwright-report',open:'never'}]],
  use:{
    baseURL:globalThis.process?.env?.E2E_BASE_URL||'http://127.0.0.1:5173',
    trace:'retain-on-failure',
    screenshot:'only-on-failure',
    video:'retain-on-failure'
  }
})
