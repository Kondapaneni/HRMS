#!/usr/bin/env python3
"""Finish explicit API migration after React Query packages were removed."""
from pathlib import Path
import re

root = Path('frontend/src')
methods = {
    '.invalidateQueries(': '.refresh(',
    '.refetchQueries(': '.refresh(',
    '.getQueryData(': '.peek(',
    '.setQueryData(': '.update(',
    '.cancelQueries(': '.cancel(',
    '.removeQueries(': '.cancel(',
    '.resetQueries(': '.refresh(',
    '.getQueryState(': '.getState(',
    '.getQueryCache().subscribe(': '.subscribe(',
    '.clear(': '.reset(',
}
changed = []
for p in sorted(root.rglob('*')):
    if p.suffix not in ('.js', '.jsx') or p == root / 'state/remote.js':
        continue
    old = p.read_text(encoding='utf-8')
    text = old
    # Scope replacements to the useRefreshControl controller instance;
    # never rename unrelated collections' clear() or cache APIs.
    for original, replacement in methods.items():
        text = text.replace('refreshControl' + original, 'refreshControl' + replacement)
    text = text.replace('the memory-only cache and cleared on logout',
                        'route code only (no record caching)')
    text = text.replace('No previous-account private queries may cross a login.',
                        'Immediately clear mounted private records on account switch.')
    text = text.replace('No previous-account private queries may cross', 
                        'Do not share private records between')
    if text != old:
        p.write_text(text, encoding='utf-8')
        changed.append(str(p))
for p in root.rglob('*'):
    if p.suffix not in ('.js', '.jsx'):
        continue
    text = p.read_text(encoding='utf-8')
    if re.search(r'\brefreshControl\.(?:invalidateQueries|refetchQueries|getQueryData|setQueryData|cancelQueries|getQueryState|getQueryCache|clear)\s*\(', text):
        raise RuntimeError(f'Unconverted controller API in {p}')
    if "@tanstack/react-query" in text or re.search(r'\b(?:useQuery|useMutation|useQueryClient|QueryClientProvider)\b', text):
        raise RuntimeError(f'Legacy package still referenced in {p}')
print('REMOVED_QUERY_CACHE legacy methods repaired:', len(changed), 'files')
