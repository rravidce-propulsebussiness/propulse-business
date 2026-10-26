/**
 * Choose where the viewport should stay after a client-side navigation.
 * A query string, tab or hash-view change does not mean a new page.
 */
export function chooseScrollPosition({
  previousRoute,
  nextRoute,
  navigationType,
  storedPosition,
  previousPosition,
}) {
  const top = { top: 0, left: 0 }

  // The Back/Forward buttons should return to the position for that history entry.
  if (navigationType === 'POP' && storedPosition) return storedPosition

  // Tabs, filters, search parameters and other controls on the same page
  // must not unexpectedly throw the user back to the header.
  if (previousRoute?.pathname === nextRoute.pathname) {
    return previousPosition || top
  }

  // A genuinely different page starts at its beginning (anchors are handled
  // separately by RouteScrollManager).
  return top
}
