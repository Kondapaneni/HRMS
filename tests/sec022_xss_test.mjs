import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildAttendanceInfoWindowContent, isAllowedAttendancePhotoUrl } from '../frontend/src/utils/attendanceInfoWindow.js';

class MockElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.style = { cssText: '' };
    this.children = [];
    this.value = '';
  }
  set textContent(value) { this.value = String(value); this.children = []; }
  get textContent() { return this.value + this.children.map(child => child.textContent).join(''); }
  appendChild(child) { this.children.push(child); return child; }
}
const doc = { createElement: (tagName) => new MockElement(tagName) };
const flatten = (node) => [node, ...node.children.flatMap(flatten)];
const payload = '<img src=x onerror=alert(1)><svg onload=alert(2)>';
const marker = buildAttendanceInfoWindowContent({
  title: 'Check In', photoUrl: 'javascript:alert(1)', lat: 0, lng: 0, address: payload,
}, doc);
assert(marker instanceof MockElement);
assert.equal(flatten(marker).filter(node => node.tagName === 'img').length, 0);
assert(marker.textContent.includes(payload), 'Address is literal text, not parsed as markup');
assert(marker.textContent.includes('javascript:alert(1)'), 'Unsafe photo is a text-only label');
assert(marker.textContent.includes('0.000000, 0.000000'), 'Valid zero coordinates display');

for (const url of ['https://example.invalid/photo.png', 'http://example.invalid/photo.jpg', '/Attendance/pic.jpg', 'data:image/jpeg;base64,YWJj']) {
  assert(isAllowedAttendancePhotoUrl(url), 'Expected allowed raster source: ' + url);
  const node = buildAttendanceInfoWindowContent({ title: 'Punch In', photoUrl: url, lat: 10, lng: 20, address: 'Vijayawada' }, doc);
  const images = flatten(node).filter(child => child.tagName === 'img');
  assert.equal(images.length, 1);
  assert.equal(images[0].src, url);
  assert.equal(images[0].referrerPolicy, 'no-referrer');
  assert(node.textContent.includes('Vijayawada'));
}
for (const url of ['javascript:alert(1)', 'data:text/html;base64,PHNjcmlwdD4=', 'data:image/svg+xml,<svg/onload=alert(1)>', '//evil.invalid/x', '/\\evil.invalid/x', 'ftp://host/file', 'http://']) {
  assert.equal(isAllowedAttendancePhotoUrl(url), false, 'Unsafe URL allowed: ' + url);
}
const invalidCoordinates = buildAttendanceInfoWindowContent({ title: 'Check Out', lat: 'NaN', lng: 1, address: '', photoUrl: '' }, doc);
assert(invalidCoordinates.textContent.includes('Not available'));

const page = readFileSync('frontend/src/pages/AdminAttendanceLocation.jsx', 'utf8');
assert(page.includes('infoWindow.setContent(buildAttendanceInfoWindowContent('));
assert(!page.includes('infoWindow.setContent(content)'));
const components = [
  'Leave', 'Welcome', 'ResetPassword', 'CandidateOffer', 'AssessmentResult',
  'CandidateRejected', 'CandidateActivate', 'CandidateInterview', 'AssessmentAssigned',
  'CandidateShortlisted', 'CandidateDocumentsVerified', 'CandidateApplicationSuccess', 'Promotion',
];
for (const component of components) {
  const source = readFileSync('frontend/src/components/emailTemplates/' + component + 'EmailTemplate.jsx', 'utf8');
  assert(source.includes('EmailTemplatePreview'), component + ': shared preview missing');
  assert(!source.includes('dangerouslySetInnerHTML'), component + ': raw HTML injection remains');
}
const preview = readFileSync('frontend/src/components/emailTemplates/EmailTemplatePreview.jsx', 'utf8');
assert(preview.includes('sandbox="allow-same-origin"'));
assert(!preview.includes('allow-scripts'));
assert(!preview.includes('allow-forms'));
assert(preview.includes('srcDoc={html}'));
console.log('SEC-022: Maps DOM payloads, photo URLs, static email preview boundaries passed');
