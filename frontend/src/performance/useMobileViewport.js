import { useEffect, useState } from 'react';

// One protected route must mount only the visible responsive data view.
// CSS-hiding the other view left both mounted and firing duplicate private GETs.
export function useMobileViewport() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(max-width: 767px)').matches);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const onChange = () => setMobile(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return mobile;
}
