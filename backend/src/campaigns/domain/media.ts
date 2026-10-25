export class InvalidGallery extends Error {}

export function normalizeVideoUrl(value: string | null): string | null {
  if (!value?.trim()) return null
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new InvalidGallery()
    const host = url.hostname.toLowerCase()
    const youtubeId = host === 'youtu.be' ? url.pathname.slice(1) :
      ['youtube.com', 'www.youtube.com'].includes(host) && url.pathname === '/watch' ? url.searchParams.get('v') : null
    if (youtubeId && /^[\w-]{11}$/.test(youtubeId)) return `https://www.youtube.com/watch?v=${youtubeId}`
    if (['vimeo.com', 'www.vimeo.com'].includes(host) && /^\/[1-9]\d{0,11}$/.test(url.pathname)) return `https://vimeo.com${url.pathname}`
    throw new InvalidGallery()
  } catch { throw new InvalidGallery() }
}
