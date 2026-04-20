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

    console.log(`[v0] Fetching 5 latest videos from channel: ${channelId}`)

    // Search for latest 5 videos (any type - shorts or regular videos)
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search")
    searchUrl.searchParams.append("key", apiKey)
    searchUrl.searchParams.append("channelId", channelId)
    searchUrl.searchParams.append("part", "snippet")
    searchUrl.searchParams.append("order", "date")
    searchUrl.searchParams.append("maxResults", "5")
    searchUrl.searchParams.append("type", "video")

    console.log(`[v0] Searching for videos...`)
    const searchResponse = await fetch(searchUrl.toString())

    if (!searchResponse.ok) {
      console.error(`[v0] Search API failed: ${searchResponse.status}`)
      throw new Error(`YouTube API search failed: ${searchResponse.status}`)
    }

    const searchData = await searchResponse.json()
    
    const videos: Video[] = (searchData.items || []).map((item: any) => {
      const videoId = item.id.videoId
      const title = item.snippet.title
      const thumbnail = item.snippet.thumbnails?.high?.url || `/placeholder.svg?height=180&width=320`
      
      return {
        id: videoId,
        title,
        thumbnail,
        url: `https://www.youtube.com/embed/${videoId}?rel=0&showinfo=0&enablejsapi=1`,
      }
    })

    console.log(`[v0] Successfully fetched ${videos.length} latest videos`)
    return Response.json({ videos })
  } catch (error) {
    console.error("[v0] Error fetching YouTube videos:", error)
    return Response.json({ error: "Gagal memuat video dari YouTube", videos: [] }, { status: 500 })
  }
}
