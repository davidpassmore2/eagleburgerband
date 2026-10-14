/**
 * Media utility functions for extracting embed URLs and parsing media links.
 */

/**
 * Extracts a YouTube embed URL from a variety of YouTube link formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 *
 * Supports optional start time / timestamp (e.g. ?t=90s or &start=90).
 * Returns null if the URL is not a valid YouTube resource.
 */
export function getYouTubeEmbedUrl(url?: string | null): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    // Check if it's already an embed URL
    if (trimmed.includes("youtube.com/embed/") || trimmed.includes("youtube-nocookie.com/embed/")) {
      const match = trimmed.match(/(?:embed\/)([a-zA-Z0-9_-]{11})/);
      if (match && match[1]) {
        return `https://www.youtube-nocookie.com/embed/${match[1]}`;
      }
    }

    // Standard patterns
    const regExp = /(?:(?:youtu\.be\/)|(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|v\/|embed\/|shorts\/|live\/)))([a-zA-Z0-9_-]{11})/i;
    const match = trimmed.match(regExp);

    if (match && match[1]) {
      const videoId = match[1];

      let startSeconds: number | null = null;
      try {
        const urlObj = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
        const tParam = urlObj.searchParams.get("t") || urlObj.searchParams.get("start");
        if (tParam) {
          if (/^\d+$/.test(tParam)) {
            startSeconds = parseInt(tParam, 10);
          } else {
            const matchH = tParam.match(/(\d+)h/i);
            const matchM = tParam.match(/(\d+)m/i);
            const matchS = tParam.match(/(\d+)s/i);
            let s = 0;
            if (matchH) s += parseInt(matchH[1], 10) * 3600;
            if (matchM) s += parseInt(matchM[1], 10) * 60;
            if (matchS) s += parseInt(matchS[1], 10);
            if (s > 0) startSeconds = s;
          }
        }
      } catch {
        // ignore timestamp parse errors
      }

      const params = new URLSearchParams();
      if (startSeconds !== null && startSeconds > 0) {
        params.set("start", String(startSeconds));
      }

      const queryString = params.toString();
      return `https://www.youtube-nocookie.com/embed/${videoId}${queryString ? `?${queryString}` : ""}`;
    }
  } catch {
    return null;
  }

  return null;
}

