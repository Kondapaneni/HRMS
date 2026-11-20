/**
 * Construct the loan origination list URL from the current mounted-view scope.
 * This module has no network, session, browser-storage or caching side effects.
 * 
 * List search belongs to ["origination", "leads", "list", search].
 * Other callers (dashboard "recent", member details) must load the full
 * authorized list; their fourth scope entry must never become a search filter.
 */
export function loanLeadListPath(scope) {
  const isList = Array.isArray(scope)
    && scope[0] === 'origination'
    && scope[1] === 'leads'
    && scope[2] === 'list';
  const search = isList && typeof scope[3] === 'string'
    ? scope[3].trim()
    : '';
  return search
    ? `/leads/list?search=${encodeURIComponent(search)}`
    : '/leads/list';
}
