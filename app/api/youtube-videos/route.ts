import { NextResponse } from "next/server"

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
// Channel ID untuk @PemkabGowa
const CHANNEL_ID = "UCgS4I9aIjmYBflvWjPgIRaw"

export async function GET() {
  try {
    if (!YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: "YouTube API key belum dikonfigurasi", videos: [] },
        { status: 500 }
      )
    }

    // Fetch video terbaru dari channel menggunakan YouTube Data API v3
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&channelId=${CHANNEL_ID}&part=snippet&order=date&maxResults=5&type=video`

    const response = await fetch(searchUrl, {
      next: { revalidate: 3600 }, // Cache selama 1 jam
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("YouTube API error:", errorData)
      throw new Error(`YouTube API error: ${response.status}`)
    }

    const data = await response.json()

    const videos = (data.items || []).map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
      url: `https://www.youtube-nocookie.com/embed/${item.id.videoId}?rel=0&showinfo=0&enablejsapi=1`,
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
