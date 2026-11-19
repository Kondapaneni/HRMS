import { useCallback, useRef } from 'react';

// SEC-022: Render trusted, repository-owned sample email HTML in a script-free
// sandbox, never in the authenticated application's parent DOM.
const EmailTemplatePreview = ({ html, className = '' }) => {
  const iframeRef = useRef(null);
  const resizePreview = useCallback(() => {
    const frame = iframeRef.current;
    try {
      const doc = frame?.contentDocument;
      const contentHeight = Math.max(doc?.body?.scrollHeight || 0, doc?.documentElement?.scrollHeight || 0);
      if (frame && contentHeight > 0) frame.style.height = String(contentHeight + 8) + 'px';
    } catch {
      // The frame remains scrollable if a browser denies document inspection.
    }
  }, []);

  return (
    <iframe
      ref={iframeRef}
      title="Email template preview"
      className={className}
      sandbox="allow-same-origin"
      referrerPolicy="no-referrer"
      srcDoc={html}
      onLoad={resizePreview}
      style={{ display: 'block', width: '100%', height: '720px', border: 0 }}
    />
  );
};

export default EmailTemplatePreview;
