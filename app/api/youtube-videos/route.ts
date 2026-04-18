import { NextResponse } from "next/server"

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
// Channel ID untuk @PemkabGowa
const CHANNEL_ID = "UCgS4I9aIjmYBflvWjPgIRaw"

export async function GET() {
  try {
    console.log("[v0] YOUTUBE_API_KEY exists:", !!YOUTUBE_API_KEY)
    console.log("[v0] CHANNEL_ID:", CHANNEL_ID)

    if (!YOUTUBE_API_KEY) {
      console.error("[v0] YOUTUBE_API_KEY tidak ditemukan")
      return NextResponse.json(
        { error: "YouTube API key belum dikonfigurasi", videos: [] },
        { status: 500 }
      )
    }

    // Fetch video terbaru dari channel menggunakan YouTube Data API v3
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&channelId=${CHANNEL_ID}&part=snippet&order=date&maxResults=5&type=video`
    console.log("[v0] Fetching URL:", searchUrl.replace(YOUTUBE_API_KEY, "***API_KEY***"))

    const response = await fetch(searchUrl, {
      next: { revalidate: 3600 }, // Cache selama 1 jam
    })

    console.log("[v0] Response status:", response.status)

    if (!response.ok) {
      const errorData = await response.json()
      console.error("[v0] YouTube API error:", errorData)
      throw new Error(`YouTube API error: ${response.status}`)
    }

    const data = await response.json()
    console.log("[v0] YouTube API response items count:", data.items?.length || 0)

    const videos = (data.items || []).map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
      url: `https://www.youtube-nocookie.com/embed/${item.id.videoId}?rel=0&showinfo=0&enablejsapi=1`,
    }))

    console.log("[v0] Returning videos count:", videos.length)
    return NextResponse.json({ videos })
  } catch (error) {
    console.error("[v0] Error fetching YouTube videos:", error)
    return NextResponse.json(
      { error: "Gagal memuat video dari YouTube", videos: [] },
      { status: 500 }
    )
  }
}
