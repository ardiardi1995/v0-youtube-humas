interface Video {
  id: string
  title: string
  thumbnail: string
  url: string
}

export async function GET() {
  try {
    const apiKey = "AIzaSyBv-W6AMNxvB5MkKPF2BVjarqgcuDMTqsM"
    const channelId = "UCqCR3PZqfIA9jaIZk0ecOdQ"

    console.log(`[v0] Fetching videos from YouTube Data API v3 for channel: ${channelId}`)

    // Use YouTube Data API v3 to search for videos
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search")
    searchUrl.searchParams.append("key", apiKey)
    searchUrl.searchParams.append("channelId", channelId)
    searchUrl.searchParams.append("part", "snippet")
    searchUrl.searchParams.append("order", "date")
    searchUrl.searchParams.append("maxResults", "5")
    searchUrl.searchParams.append("type", "video")

    console.log(`[v0] API URL: ${searchUrl.toString()}`)

    const response = await fetch(searchUrl.toString())

    if (!response.ok) {
      console.error(`[v0] API fetch failed with status ${response.status}`)
      const errorText = await response.text()
      console.error(`[v0] Error response: ${errorText}`)
      throw new Error(`YouTube API error: ${response.status}`)
    }

    const data = await response.json()
    console.log(`[v0] API response received with ${data.items?.length || 0} items`)

    const videos: Video[] = (data.items || []).map((item: any) => {
      const videoId = item.id.videoId
      const title = item.snippet.title
      const thumbnail = item.snippet.thumbnails?.high?.url || `/placeholder.svg?height=180&width=320`

      return {
        id: videoId,
        title,
        thumbnail,
        url: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&showinfo=0&enablejsapi=1`,
      }
    })

    console.log(`[v0] Successfully fetched ${videos.length} videos from YouTube Data API`)
    return Response.json({ videos })
  } catch (error) {
    console.error("[v0] Error fetching YouTube videos:", error)
    return Response.json({ error: "Gagal memuat video dari YouTube", videos: [] }, { status: 500 })
  }
}
