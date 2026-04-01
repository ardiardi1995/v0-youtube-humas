// Channel ID untuk @PemkabGowa
const CHANNEL_ID = "UC4d3pXh6gVgcg9NVVJhE0Yw"

interface Video {
  id: string
  title: string
  thumbnail: string
  url: string
}

export async function GET() {
  try {
    console.log("[v0] Fetching YouTube videos from RSS feed...")

    // Gunakan YouTube RSS feed (tidak perlu API key)
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`

    const response = await fetch(rssUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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

    const videos: Video[] = entries.slice(0, 5).map((entry: string) => {
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

    console.log(`[v0] Successfully fetched ${videos.length} videos`)
    return Response.json({ videos })
  } catch (error) {
    console.error("[v0] Error fetching YouTube videos:", error)
    return Response.json({ error: "Gagal memuat video dari YouTube", videos: [] }, { status: 500 })
  }
}
