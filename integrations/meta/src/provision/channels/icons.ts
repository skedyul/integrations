/** Small product marks stored on the channel definition. */
function svgIcon(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export const WHATSAPP_ICON_URL = svgIcon(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#25D366"/><path fill="#fff" d="M12 5.4a6.6 6.6 0 0 0-5.7 9.9L5.6 18.6l3.4-.9A6.6 6.6 0 1 0 12 5.4zm3.7 9.3c-.2.5-1 .9-1.4 1-.4.1-.8.2-1.3 0-.3-.1-.7-.3-1.2-.5-2.1-1.1-3.5-3.2-3.6-3.3-.1-.2-.9-1.2-.9-2.3s.5-1.6.8-1.8c.2-.2.4-.3.6-.3h.4c.1 0 .3 0 .5.4.1.4.6 1.5.6 1.6 0 .2 0 .3-.1.5l-.3.4c-.1.1-.2.3-.1.5.1.2.6 1 1.3 1.6.9.8 1.7 1.1 1.9 1.2.2.1.4.1.5-.1l.5-.6c.1-.2.3-.1.5 0 .2.1 1.3.6 1.5.7.2.1.4.2.4.3.1.3 0 .7-.1 1.1z"/></svg>`,
)

export const MESSENGER_ICON_URL = svgIcon(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><linearGradient id="messenger" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#00B2FF"/><stop offset=".55" stop-color="#006AFF"/><stop offset="1" stop-color="#A033FF"/></linearGradient></defs><circle cx="12" cy="12" r="12" fill="url(#messenger)"/><path fill="#fff" d="M12 6.1c-3.5 0-6.2 2.6-6.2 5.9 0 1.8.9 3.5 2.4 4.6v2.5l2.3-1.3c.5.1.9.2 1.5.2 3.5 0 6.2-2.6 6.2-5.9S15.5 6.1 12 6.1zm.7 8-1.6-1.7-3.2 1.7 3.5-3.7 1.6 1.7 3.1-1.7-3.4 3.7z"/></svg>`,
)

export const INSTAGRAM_ICON_URL = svgIcon(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><radialGradient id="instagram" cx="30%" cy="107%" r="130%"><stop offset="0" stop-color="#feda75"/><stop offset=".35" stop-color="#fa7e1e"/><stop offset=".65" stop-color="#d62976"/><stop offset="1" stop-color="#4f5bd5"/></radialGradient></defs><rect width="24" height="24" rx="6" fill="url(#instagram)"/><rect x="6.2" y="6.2" width="11.6" height="11.6" rx="3.4" fill="none" stroke="#fff" stroke-width="1.6"/><circle cx="12" cy="12" r="2.7" fill="none" stroke="#fff" stroke-width="1.6"/><circle cx="16.3" cy="7.8" r=".9" fill="#fff"/></svg>`,
)
