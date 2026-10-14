// The site mark: a shadow ringed by its photon ring, crossed by a tilted disk.

export const emblem = (cls = '') => `
<svg class="emblem ${cls}" viewBox="0 0 64 64" aria-hidden="true">
  <g transform="rotate(-40 32 32)" fill="none" stroke="currentColor">
    <path d="M3.5 32 A28.5 6.5 0 0 1 60.5 32" stroke-width="1.6" opacity=".5"/>
    <circle cx="32" cy="32" r="12" stroke-width="2.6"/>
    <circle cx="32" cy="32" r="16.5" stroke-width="1" opacity=".45"/>
    <path d="M3.5 32 A28.5 6.5 0 0 0 60.5 32" stroke-width="3.2"/>
  </g>
</svg>`;

export const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
