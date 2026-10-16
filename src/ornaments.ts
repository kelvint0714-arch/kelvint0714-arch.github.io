// The site mark: one block of the valley, lit from the left, with an arched door.

export const emblem = (cls = '') => `
<svg class="emblem ${cls}" viewBox="0 0 64 64" aria-hidden="true">
  <path d="M32 7 53 19 32 31 11 19Z" fill="currentColor" fill-opacity=".28"/>
  <path d="M11 19 32 31V56L11 44Z" fill="currentColor" fill-opacity=".55"/>
  <path d="M32 31 53 19V44L32 56Z" fill="currentColor" fill-opacity=".88"/>
  <path d="M18.5 46.5 25 50.2V40.4C25 36.4 18.5 32.7 18.5 36.7Z" fill="currentColor"/>
</svg>`;

export const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
