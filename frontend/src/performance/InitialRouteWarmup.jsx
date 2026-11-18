import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { preloadInitialRoute } from './routeWarmup';

// Rendered outside AuthProvider so protected route JS can download at the
// same time as the HttpOnly refresh-cookie and server-authoritative /me calls.
// Code-only: never prefetches a private API or reveals a protected UI.
export default function InitialRouteWarmup() {
  const { pathname } = useLocation();
  useEffect(() => {
    void preloadInitialRoute(pathname);
  }, [pathname]);
  return null;
}
