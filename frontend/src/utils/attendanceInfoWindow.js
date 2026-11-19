// SEC-022: Build Google Maps InfoWindow content with DOM APIs, never HTML strings.
export const isAllowedAttendancePhotoUrl = (value) => {
  if (typeof value !== 'string') return false;
  const url = value.trim();
  if (!url) return false;

  // Employee camera uploads may be data URLs; never accept SVG or HTML payloads.
  if (/^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/i.test(url)) {
    return true;
  }
  if (url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\')) {
    return true;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const makeNode = (doc, tag, css, text) => {
  const node = doc.createElement(tag);
  node.style.cssText = css;
  if (text !== undefined) node.textContent = String(text);
  return node;
};

const formattedCoordinates = (lat, lng) => {
  if (lat === null || lat === undefined || lat === '' || lng === null || lng === undefined || lng === '') {
    return 'Not available';
  }
  const latitude = Number(lat);
  const longitude = Number(lng);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? latitude.toFixed(6) + ', ' + longitude.toFixed(6)
    : 'Not available';
};

export const buildAttendanceInfoWindowContent = ({ title, photoUrl, lat, lng, address }, doc) => {
  const root = makeNode(doc, 'div', 'max-width:320px;font-family:Inter,system-ui,sans-serif;color:#131315;padding:4px;');
  root.appendChild(makeNode(doc, 'div', 'font-weight:600;margin-bottom:8px;font-size:13px;color:#131315;', title));
  const body = makeNode(doc, 'div', 'display:flex;gap:10px;align-items:flex-start;');
  const hasPhoto = photoUrl !== null && photoUrl !== undefined && photoUrl !== '';
  const safeImage = isAllowedAttendancePhotoUrl(photoUrl);

  if (hasPhoto && safeImage) {
    const wrap = makeNode(doc, 'div', 'flex-shrink:0;width:105px;');
    const img = makeNode(doc, 'img', 'width:100%;height:auto;max-height:130px;object-fit:cover;border-radius:12px;box-shadow:0 4px 12px rgba(19,19,21,0.08);');
    img.src = photoUrl.trim();
    img.alt = title;
    img.referrerPolicy = 'no-referrer';
    wrap.appendChild(img);
    body.appendChild(wrap);
  } else if (hasPhoto) {
    body.appendChild(makeNode(doc, 'div', 'flex-shrink:0;width:95px;padding:12px 6px;background:#EAF0FA;border:1px solid #D2E0F5;border-radius:10px;color:#5B86C2;font-size:11px;text-align:center;box-sizing:border-box;font-weight:600;word-break:break-word;', photoUrl));
  } else {
    body.appendChild(makeNode(doc, 'div', 'flex-shrink:0;width:95px;padding:12px 6px;background:#F8F8F8;border:1px solid #EFEFF1;border-radius:10px;color:#6B6B75;font-size:11px;text-align:center;box-sizing:border-box;', 'No photo'));
  }

  const details = makeNode(doc, 'div', 'font-size:11.5px;line-height:1.5;color:#6B6B75;flex-grow:1;min-width:0;');
  const addDetail = (label, value, marginTop = '') => {
    const field = makeNode(doc, 'div', 'word-break:break-word;' + marginTop);
    field.appendChild(makeNode(doc, 'strong', 'color:#131315;', label));
    field.appendChild(doc.createElement('br'));
    field.appendChild(makeNode(doc, 'span', '', value));
    details.appendChild(field);
  };
  addDetail('Location:', formattedCoordinates(lat, lng));
  addDetail('Address:', address || 'Not available', 'margin-top:6px;');
  body.appendChild(details);
  root.appendChild(body);
  return root;
};
