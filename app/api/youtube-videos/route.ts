interface Video {
  id: string
  title: string
  thumbnail: string
  url: string
}

// Helper function to parse duration from MM:SS or M:SS format
function parseDurationString(durationText: string): number {
  if (!durationText) return 0
  
  const parts = durationText.split(":")
  let totalSeconds = 0
  
  if (parts.length === 3) {
    // HH:MM:SS
    totalSeconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2])
  } else if (parts.length === 2) {
    // MM:SS
    totalSeconds = parseInt(parts[0]) * 60 + parseInt(parts[1])
  } else {
    // SS only
    totalSeconds = parseInt(parts[0])
  }
  
  return totalSeconds
}

export async function GET() {
  try {
    const channelUrl = "https://www.youtube.com/@PemkabGowa/videos"
    
    console.log(`[v0] Fetching videos from: ${channelUrl}`)

    const response = await fetch(channelUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    })

    if (!response.ok) {
      console.error(`[v0] Failed to fetch channel page: ${response.status}`)
      throw new Error(`Failed to fetch channel page: ${response.status}`)
    }

    const html = await response.text()
    console.log(`[v0] Channel page fetched, analyzing content...`)

    // Extract ytInitialData from the HTML
    const ytInitialDataMatch = html.match(/var ytInitialData = ({.*?});/)
    if (!ytInitialDataMatch) {
      console.error("[v0] Could not find ytInitialData in page")
      throw new Error("Could not parse YouTube page data")
    }

    const data = JSON.parse(ytInitialDataMatch[1])
    
    // Navigate through the data structure to find videos
    const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || []
    console.log(`[v0] Found ${tabs.length} tabs`)

    let videoItems: any[] = []
    
    for (const tab of tabs) {
      const tabContent = tab?.tabRenderer?.content
      if (tabContent) {
        const richGridRenderer = tabContent.richGridRenderer
        if (richGridRenderer?.contents) {
          videoItems = richGridRenderer.contents
          console.log(`[v0] Found ${videoItems.length} items in grid`)
          break
        }
      }
    }

    // Filter and extract video information
    const videos: Video[] = []
    
    for (const item of videoItems) {
      if (videos.length >= 5) break

      const videoRenderer = item?.richItemRenderer?.content?.videoRenderer
      if (!videoRenderer) continue

      const videoId = videoRenderer.videoId
      const title = videoRenderer.title?.runs?.[0]?.text || videoRenderer.title?.simpleText || "Untitled"
      
      // Get thumbnail
      const thumbnail = videoRenderer.thumbnail?.thumbnails?.[videoRenderer.thumbnail.thumbnails.length - 1]?.url || `/placeholder.svg?height=180&width=320`
      
      // Check if it's a short by looking at badge
      const badge = videoRenderer.badges?.[0]?.metadataBadgeRenderer?.label || ""
      const isShort = badge.includes("Short") || badge.includes("Shorts")
      
      // Parse duration correctly (MM:SS format)
      const durationText = videoRenderer.lengthText?.simpleText || ""
      const durationSeconds = parseDurationString(durationText)
      const isDurationShort = durationSeconds > 0 && durationSeconds < 60
      
      console.log(`[v0] Video: ${title}, Duration: ${durationText} (${durationSeconds}s), IsShort: ${isShort}`)

      // Skip shorts
      if (isShort || isDurationShort) {
        console.log(`[v0] Skipped (short video)`)
        continue
      }

      videos.push({
        id: videoId,
        title,
        thumbnail,
        url: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&showinfo=0&enablejsapi=1`,
      })
      
      console.log(`[v0] Added to results`)
    }

    console.log(`[v0] Successfully extracted ${videos.length} videos`)
    return Response.json({ videos })
  } catch (error) {
    console.error("[v0] Error fetching YouTube videos:", error)
    return Response.json({ error: "Gagal memuat video dari YouTube", videos: [] }, { status: 500 })
  }
}
