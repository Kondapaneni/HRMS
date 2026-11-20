// Keep the orientation warning strictly tied to the live viewport. The old
// always-mounted, CSS-hidden overlay could intercept taps on Android WebView
// after a landscape -> portrait transition.
export const LANDSCAPE_WARNING_QUERY = '(orientation: landscape) and (max-width: 1024px)';

export function isLandscapeWarningActive(view = typeof window === 'undefined' ? null : window) {
  if (!view) return false;
  // Some Android WebViews update CSS orientation after the native screen
  // orientation. A known portrait screen must never remain touch-blocked.
  if (view.screen?.orientation?.type?.startsWith('portrait')) return false;
  // A portrait-shaped viewport is another reliable veto if ScreenOrientation
  // and media queries are still reporting the pre-rotation landscape state.
  if (view.innerWidth > 0 && view.innerHeight > 0 &&
      view.innerWidth <= view.innerHeight) return false;
  const media = view.matchMedia?.(LANDSCAPE_WARNING_QUERY);
  if (media) return Boolean(media.matches);
  return view.innerWidth > view.innerHeight && view.innerWidth <= 1024;
}

export function subscribeLandscapeWarning(notify) {
  if (typeof window === 'undefined') return () => {};
  const view = window;
  const media = view.matchMedia?.(LANDSCAPE_WARNING_QUERY);
  let settleTimeout;
  const check = () => {
    notify();
    // WebView orientation/media-query updates can lag the resize event.
    if (settleTimeout !== undefined) view.clearTimeout(settleTimeout);
    settleTimeout = view.setTimeout(notify, 250);
  };
  const attach = (source, event, listener) => source?.addEventListener?.(event, listener);
  const detach = (source, event, listener) => source?.removeEventListener?.(event, listener);
  attach(media, 'change', check);
  // Older Android WebViews only implement the legacy MediaQueryList API.
  if (!media?.addEventListener) media?.addListener?.(check);
  attach(view, 'resize', check);
  attach(view, 'orientationchange', check);
  attach(view, 'pageshow', check);
  attach(view.visualViewport, 'resize', check);
  attach(view.screen?.orientation, 'change', check);
  return () => {
    detach(media, 'change', check);
    if (!media?.removeEventListener) media?.removeListener?.(check);
    detach(view, 'resize', check);
    detach(view, 'orientationchange', check);
    detach(view, 'pageshow', check);
    detach(view.visualViewport, 'resize', check);
    detach(view.screen?.orientation, 'change', check);
    if (settleTimeout !== undefined) view.clearTimeout(settleTimeout);
  };
}
