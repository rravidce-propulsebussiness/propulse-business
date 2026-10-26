import assert from 'node:assert/strict'
import { chooseScrollPosition } from '../src/utils/scrollRestoration.js'

const current = { pathname: '/professional-requests', search: '', key: 'original' }
const quotes = { pathname: '/professional-requests', search: '?tab=quotes', key: 'tab' }
const profile = { pathname: '/profile', search: '?tab=services', key: 'profile' }
const position = { top: 860, left: 0 }
const tabPosition = { top: 430, left: 0 }

assert.deepEqual(
  chooseScrollPosition({ previousRoute: current, nextRoute: quotes, navigationType: 'PUSH', previousPosition: position }),
  position,
  'Changing a request tab must keep the viewport position',
)

assert.deepEqual(
  chooseScrollPosition({ previousRoute: current, nextRoute: quotes, navigationType: 'REPLACE', previousPosition: position }),
  position,
  'Replacing query parameters must keep the viewport position',
)

assert.deepEqual(
  chooseScrollPosition({ previousRoute: quotes, nextRoute: { ...quotes, hash: '#details' }, navigationType: 'PUSH', previousPosition: tabPosition }),
  tabPosition,
  'Hash view selection must not reset the viewport (real DOM anchors are handled separately)',
)

assert.deepEqual(
  chooseScrollPosition({ previousRoute: current, nextRoute: profile, navigationType: 'PUSH', previousPosition: position }),
  { top: 0, left: 0 },
  'Moving to a different page should begin at the top',
)

assert.deepEqual(
  chooseScrollPosition({ previousRoute: profile, nextRoute: current, navigationType: 'POP', storedPosition: position, previousPosition: tabPosition }),
  position,
  'Returning through browser history must restore the original scroll position',
)

assert.deepEqual(
  chooseScrollPosition({ previousRoute: profile, nextRoute: current, navigationType: 'POP' }),
  { top: 0, left: 0 },
  'An unseen history entry should safely start at the top',
)

console.log('Scroll preservation policy: all 6 checks passed')
