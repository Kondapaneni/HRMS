import { useEffect, useState } from 'react';

// One protected route must mount only the visible responsive data view.
// CSS-hiding the other view left both mounted and firing duplicate private GETs.
export function useMobileViewport() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(max-width: 767px)').matches);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(max-width: 767px)');
    const onChange = () => setMobile(media.matches);
    onChange();
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    }
    media.addListener?.(onChange);
    return () => media.removeListener?.(onChange);
  }, []);

  return mobile;
}
