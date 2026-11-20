import React from 'react';
import PageLoader from './PageLoader';

// Keep existing AppShell Suspense boundary, but use the same full-page
// skeleton as all pages while their route code loads.
export default function RouteSkeleton() {
  return <PageLoader message="Opening page..." />;
}
