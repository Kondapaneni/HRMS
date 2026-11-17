// UI-only maintenance presentation. The PHP API is the authorization authority.
const PUBLIC_ROUTES = new Set([
  '/',
  '/login',
  '/candidate/login',
  '/candidate/activate',
  '/forgot-password',
  '/reset-password',
]);

export const isPublicMaintenanceRoute = (path) => PUBLIC_ROUTES.has(path);

export const isMaintenanceEnabled = (value) =>
  value === true || value === 'true' || value === 1 || value === '1' || value === 't';

export const shouldShowMaintenanceNotice = ({ maintenanceStatus, pathname, role, hasToken }) =>
  maintenanceStatus !== 'off'
  && !isPublicMaintenanceRoute(pathname)
  && Boolean(hasToken)
  && role !== 'admin';
