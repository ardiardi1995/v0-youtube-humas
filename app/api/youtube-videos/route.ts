interface Video {
  id: string
  title: string
  thumbnail: string
  url: string
  duration?: number
}

// Helper function to extract channel ID from channel handle
async function getChannelIdFromHandle(handle: string): Promise<string | null> {
  try {
    console.log(`[v0] Getting channel ID for @${handle}...`)
    
    const channelUrl = `https://www.youtube.com/@${handle}`
    const response = await fetch(channelUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    })

    if (!response.ok) {
      console.error(`[v0] Failed to fetch channel page: ${response.status}`)
      return null
    }

    const html = await response.text()
    
    // Extract channel ID dari meta tag atau dari URL redirect
    const channelIdMatch = html.match(/"channelId":"([^"]+)"/)
    if (channelIdMatch) {
      console.log(`[v0] Found channel ID: ${channelIdMatch[1]}`)
      return channelIdMatch[1]
    }

    // Try alternative pattern
    const altMatch = html.match(/\/channel\/([^"\/\s]+)/)
    if (altMatch) {
      console.log(`[v0] Found channel ID (alt): ${altMatch[1]}`)
      return altMatch[1]
    }

    return null
  } catch (error) {
    console.error("[v0] Error getting channel ID:", error)
    return null
  }
}

// Get video duration using noembed API
async function getVideoDuration(videoId: string): Promise<number | null> {
  try {
    const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`)
    if (!response.ok) {
      return null
    }
    const data = await response.json()
    return data.duration || null
  } catch (error) {
    console.error(`[v0] Error getting duration for ${videoId}:`, error)
    return null
  }
}

export async function GET() {
  try {
    const channelHandle = process.env.YOUTUBE_CHANNEL_HANDLE || "PemkabGowa"
    console.log(`[v0] Fetching videos for channel: @${channelHandle}`)

    // Get channel ID
    let channelId = process.env.YOUTUBE_CHANNEL_ID
    if (!channelId) {
      channelId = await getChannelIdFromHandle(channelHandle)
    }

    if (!channelId) {
      console.error("[v0] Could not determine channel ID")
      return Response.json(
        {
          error: "Tidak dapat menemukan channel ID. Pastikan channel @PemkabGowa valid.",
          videos: [],
        },
        { status: 400 }
      )
    }

    console.log(`[v0] Using channel ID: ${channelId}`)

    // Gunakan YouTube RSS feed (tidak perlu API key)
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
    console.log(`[v0] Fetching from RSS: ${rssUrl}`)

    const response = await fetch(rssUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    })

    if (!response.ok) {
      console.error(`[v0] RSS fetch failed with status ${response.status}`)
      throw new Error(`Failed to fetch RSS feed: ${response.status}`)
    }

    const xml = await response.text()
    console.log("[v0] Parsing RSS XML...")

    // Parse XML sederhana untuk mendapatkan video entries
    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || []
    console.log(`[v0] Found ${entries.length} entries in RSS feed`)

    const videoCandidates: Video[] = entries.map((entry: string) => {
      // Extract video ID dari link
      const videoIdMatch = entry.match(/yt:videoId>([^<]+)<\/yt:videoId/)
      const videoId = videoIdMatch ? videoIdMatch[1] : ""

      // Extract title
      const titleMatch = entry.match(/<title>([^<]+)<\/title>/)
      const title = titleMatch ? titleMatch[1] : "Untitled"

      // Extract thumbnail
      const thumbnailMatch = entry.match(/media:thumbnail url="([^"]+)"/)
      const thumbnail = thumbnailMatch ? thumbnailMatch[1] : `/placeholder.svg?height=180&width=320`

      return {
        id: videoId,
        title,
        thumbnail,
        url: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&showinfo=0&enablejsapi=1`,
      }
    })

    // Filter out shorts (duration < 60 seconds)
    const videos: Video[] = []
    for (const video of videoCandidates) {
      if (videos.length >= 5) break
      
      const duration = await getVideoDuration(video.id)
      if (duration && duration >= 60) {
        videos.push({ ...video, duration })
        console.log(`[v0] Added video: ${video.title} (${duration}s)`)
      } else if (duration && duration < 60) {
        console.log(`[v0] Skipped short: ${video.title} (${duration}s)`)
      }
    }

    console.log(`[v0] Successfully fetched ${videos.length} non-short videos`)
    return Response.json({ videos })
  } catch (error) {
    console.error("[v0] Error fetching YouTube videos:", error)
    return Response.json({ error: "Gagal memuat video dari YouTube", videos: [] }, { status: 500 })
  }
}
