import { NextResponse } from "next/server"

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
const CHANNEL_HANDLE = "@PemkabGowa"

export async function GET() {
  try {
    if (!YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: "YouTube API key belum dikonfigurasi", videos: [] },
        { status: 500 }
      )
    }

    // Step 1: Get channel ID and uploads playlist ID from handle
    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?key=${YOUTUBE_API_KEY}&forHandle=${CHANNEL_HANDLE}&part=contentDetails,snippet`
    
    const channelResponse = await fetch(channelUrl, {
      next: { revalidate: 3600 },
    })

    if (!channelResponse.ok) {
      const errorData = await channelResponse.json()
      console.error("Channel API error:", errorData)
      throw new Error(`Channel API error: ${channelResponse.status}`)
    }

    const channelData = await channelResponse.json()

    if (!channelData.items || channelData.items.length === 0) {
      return NextResponse.json({ error: "Channel tidak ditemukan", videos: [] }, { status: 404 })
    }

    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads

    // Step 2: Get latest videos from uploads playlist (fetch more to filter out Shorts)
    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?key=${YOUTUBE_API_KEY}&playlistId=${uploadsPlaylistId}&part=snippet&maxResults=20`

    const playlistResponse = await fetch(playlistUrl, {
      next: { revalidate: 3600 },
    })

    if (!playlistResponse.ok) {
      const errorData = await playlistResponse.json()
      console.error("Playlist API error:", errorData)
      throw new Error(`Playlist API error: ${playlistResponse.status}`)
    }

    const playlistData = await playlistResponse.json()
    const videoIds = (playlistData.items || []).map((item: any) => item.snippet.resourceId.videoId).join(",")

    // Step 3: Get video details including player info for aspect ratio detection
    const videosUrl = `https://www.googleapis.com/youtube/v3/videos?key=${YOUTUBE_API_KEY}&id=${videoIds}&part=contentDetails,snippet,player`

    const videosResponse = await fetch(videosUrl, {
      next: { revalidate: 3600 },
    })

    if (!videosResponse.ok) {
      const errorData = await videosResponse.json()
      console.error("Videos API error:", errorData)
      throw new Error(`Videos API error: ${videosResponse.status}`)
    }

    const videosData = await videosResponse.json()

    // Debug: log video data to check player dimensions
    videosData.items?.slice(0, 5).forEach((item: any, index: number) => {
      const embedWidth = item.player?.embedWidth
      const embedHeight = item.player?.embedHeight
      console.log(`[v0] Video ${index}: title="${item.snippet.title.substring(0, 30)}...", embedSize=${embedWidth}x${embedHeight}`)
    })

    // Filter out Shorts by checking embed dimensions (player.embedWidth/embedHeight)
    const videos = (videosData.items || [])
      .filter((item: any) => {
        const embedWidth = item.player?.embedWidth
        const embedHeight = item.player?.embedHeight
        
        if (embedWidth && embedHeight) {
          const aspectRatio = parseInt(embedWidth) / parseInt(embedHeight)
          // 16:9 ratio is ~1.77, Shorts (9:16) would be ~0.56
          // Accept only horizontal videos with aspect ratio > 1.2
          console.log(`[v0] Video "${item.snippet.title.substring(0, 20)}..." aspectRatio=${aspectRatio.toFixed(2)}`)
          return aspectRatio > 1.2
        }
        
        // If no embed dimensions, fall back to duration check (Shorts are usually < 60s)
        const duration = item.contentDetails?.duration || ""
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
        if (match) {
          const hours = parseInt(match[1] || "0", 10)
          const minutes = parseInt(match[2] || "0", 10)
          const seconds = parseInt(match[3] || "0", 10)
          const totalSeconds = hours * 3600 + minutes * 60 + seconds
          return totalSeconds >= 180 // Filter out videos shorter than 3 minutes as potential Shorts
        }
        
        return true
      })
      .slice(0, 5) // Take only 5 videos
      .map((item: any) => ({
        id: item.id,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
        url: `https://www.youtube-nocookie.com/embed/${item.id}?rel=0&showinfo=0&enablejsapi=1`,
      }))

    return NextResponse.json({ videos })
  } catch (error) {
    console.error("Error fetching YouTube videos:", error)
    return NextResponse.json(
      { error: "Gagal memuat video dari YouTube", videos: [] },
      { status: 500 }
    )
  }
}
