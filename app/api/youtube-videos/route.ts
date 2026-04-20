interface Video {
  id: string
  title: string
  thumbnail: string
  url: string
}

// Helper to parse ISO 8601 duration to seconds
function parseDuration(duration: string): number {
  const regex = /PT(\d+H)?(\d+M)?(\d+S)?/
  const matches = duration.match(regex)
  
  const hours = parseInt(matches?.[1] || 0) * 3600
  const minutes = parseInt(matches?.[2] || 0) * 60
  const seconds = parseInt(matches?.[3] || 0)
  
  return hours + minutes + seconds
}

export async function GET() {
  try {
    const apiKey = "AIzaSyBv-W6AMNxvB5MkKPF2BVjarqgcuDMTqsM"
    const channelId = "UCqCR3PZqfIA9jaIZk0ecOdQ"

    console.log(`[v0] Fetching videos using YouTube Data API v3 for channel: ${channelId}`)

    // Step 1: Search for latest videos (fetch 50 to ensure we get 5+ non-short videos after filtering)
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search")
    searchUrl.searchParams.append("key", apiKey)
    searchUrl.searchParams.append("channelId", channelId)
    searchUrl.searchParams.append("part", "snippet")
    searchUrl.searchParams.append("order", "date")
    searchUrl.searchParams.append("maxResults", "50")
    searchUrl.searchParams.append("type", "video")

    console.log(`[v0] Step 1: Searching for videos...`)
    const searchResponse = await fetch(searchUrl.toString())

    if (!searchResponse.ok) {
      console.error(`[v0] Search API failed: ${searchResponse.status}`)
      throw new Error(`YouTube API search failed: ${searchResponse.status}`)
    }

    const searchData = await searchResponse.json()
    const videoIds = (searchData.items || []).map((item: any) => item.id.videoId)
    console.log(`[v0] Found ${videoIds.length} videos, fetching details...`)

    if (videoIds.length === 0) {
      return Response.json({ videos: [] })
    }

    // Step 2: Get video details including duration
    const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos")
    videosUrl.searchParams.append("key", apiKey)
    videosUrl.searchParams.append("id", videoIds.join(","))
    videosUrl.searchParams.append("part", "snippet,contentDetails")

    console.log(`[v0] Step 2: Fetching video details...`)
    const videosResponse = await fetch(videosUrl.toString())

    if (!videosResponse.ok) {
      console.error(`[v0] Videos API failed: ${videosResponse.status}`)
      throw new Error(`YouTube API videos failed: ${videosResponse.status}`)
    }

    const videosData = await videosResponse.json()

    // Step 3: Filter out shorts (duration < 60 seconds) and limit to 5
    const videos: Video[] = []
    for (const item of videosData.items || []) {
      if (videos.length >= 5) break

      const videoId = item.id
      const title = item.snippet.title
      const thumbnail = item.snippet.thumbnails?.high?.url || `/placeholder.svg?height=180&width=320`
      const duration = parseDuration(item.contentDetails.duration)

      console.log(`[v0] Video: ${title}, Duration: ${duration}s`)

      // Only include videos >= 60 seconds (not shorts)
      if (duration >= 60) {
        videos.push({
          id: videoId,
          title,
          thumbnail,
          url: `https://www.youtube.com/embed/${videoId}?rel=0&showinfo=0&enablejsapi=1`,
        })
        console.log(`[v0] Added to results`)
      } else {
        console.log(`[v0] Skipped (short video)`)
      }
    }

    console.log(`[v0] Successfully fetched ${videos.length} non-short videos`)
    return Response.json({ videos })
  } catch (error) {
    console.error("[v0] Error fetching YouTube videos:", error)
    return Response.json({ error: "Gagal memuat video dari YouTube", videos: [] }, { status: 500 })
  }
}
