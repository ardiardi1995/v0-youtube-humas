export async function GET() {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY
    const channelId = process.env.YOUTUBE_CHANNEL_ID

    if (!apiKey || !channelId) {
      console.error("[v0] Missing YOUTUBE_API_KEY or YOUTUBE_CHANNEL_ID")
      return Response.json(
        {
          error: "YouTube API tidak dikonfigurasi. Tambahkan YOUTUBE_API_KEY dan YOUTUBE_CHANNEL_ID ke environment variables.",
          videos: [],
        },
        { status: 400 }
      )
    }

    // Fetch latest videos from channel
    const url = new URL("https://www.googleapis.com/youtube/v3/search")
    url.searchParams.append("key", apiKey)
    url.searchParams.append("channelId", channelId)
    url.searchParams.append("part", "snippet")
    url.searchParams.append("order", "date")
    url.searchParams.append("maxResults", "5")
    url.searchParams.append("type", "video")

    const response = await fetch(url.toString())

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`)
    }

    const data = await response.json()

    const videos = (data.items || []).map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.high.url,
      url: `https://www.youtube-nocookie.com/embed/${item.id.videoId}?rel=0&showinfo=0&enablejsapi=1`,
    }))

    return Response.json({ videos })
  } catch (error) {
    console.error("[v0] Error fetching YouTube videos:", error)
    return Response.json({ error: "Failed to fetch videos", videos: [] }, { status: 500 })
  }
}
