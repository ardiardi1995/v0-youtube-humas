import { NextResponse } from "next/server"

// Channel ID untuk @PemkabGowa
const CHANNEL_ID = "UCgS4I9aIjmYBflvWjPgIRaw"

export async function GET() {
  try {
    // Menggunakan RSS feed YouTube yang tidak memerlukan API key
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`

    const response = await fetch(rssUrl, {
      next: { revalidate: 3600 }, // Cache selama 1 jam
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.status}`)
    }

    const xmlText = await response.text()

    // Parse XML untuk mengekstrak video
    const videoIdRegex = /<yt:videoId>([^<]+)<\/yt:videoId>/g
    const titleRegex = /<media:title>([^<]+)<\/media:title>/g

    const videoIds: string[] = []
    const titles: string[] = []

    let match
    while ((match = videoIdRegex.exec(xmlText)) !== null) {
      videoIds.push(match[1])
    }
    while ((match = titleRegex.exec(xmlText)) !== null) {
      titles.push(match[1])
    }

    // Ambil 5 video terbaru
    const videos = videoIds.slice(0, 5).map((id, index) => ({
      id,
      title: titles[index] || "Video",
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      url: `https://www.youtube-nocookie.com/embed/${id}?rel=0&showinfo=0&enablejsapi=1`,
    }))

    return NextResponse.json({ videos })
  } catch (error) {
    console.error("[v0] Error fetching YouTube videos:", error)
    return NextResponse.json(
      { error: "Gagal memuat video dari YouTube", videos: [] },
      { status: 500 }
    )
  }
}
