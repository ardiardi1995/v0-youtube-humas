import { NextResponse } from "next/server"

// Channel ID untuk @PemkabGowa
const CHANNEL_ID = "UCgS4I9aIjmYBflvWjPgIRaw"

export async function GET() {
  try {
    // Menggunakan RSS feed YouTube yang lebih reliable
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`

    const response = await fetch(rssUrl, {
      next: { revalidate: 3600 }, // Cache selama 1 jam
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.status}`)
    }

    const xmlText = await response.text()

    // Parse XML untuk mengambil video entries
    const entries = xmlText.match(/<entry>[\s\S]*?<\/entry>/g) || []

    const videos = entries.slice(0, 5).map((entry) => {
      const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)
      const titleMatch = entry.match(/<title>([^<]+)<\/title>/)

      const videoId = videoIdMatch ? videoIdMatch[1] : ""
      const title = titleMatch ? titleMatch[1] : ""

      return {
        id: videoId,
        title: title,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        url: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&showinfo=0&enablejsapi=1`,
      }
    })

    return NextResponse.json({ videos })
  } catch (error) {
    console.error("[v0] Error fetching YouTube videos:", error)
    return NextResponse.json(
      { error: "Gagal memuat video dari YouTube", videos: [] },
      { status: 500 }
    )
  }
}
