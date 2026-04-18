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

    // Step 3: Get video details to check duration (filter out Shorts < 60 seconds)
    const videosUrl = `https://www.googleapis.com/youtube/v3/videos?key=${YOUTUBE_API_KEY}&id=${videoIds}&part=contentDetails,snippet`

    const videosResponse = await fetch(videosUrl, {
      next: { revalidate: 3600 },
    })

    if (!videosResponse.ok) {
      const errorData = await videosResponse.json()
      console.error("Videos API error:", errorData)
      throw new Error(`Videos API error: ${videosResponse.status}`)
    }

    const videosData = await videosResponse.json()

    // Filter out Shorts (duration < 60 seconds) and take only 5 videos
    const videos = (videosData.items || [])
      .filter((item: any) => {
        const duration = item.contentDetails.duration // Format: PT#M#S or PT#S
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
        if (!match) return false
        const hours = parseInt(match[1] || "0", 10)
        const minutes = parseInt(match[2] || "0", 10)
        const seconds = parseInt(match[3] || "0", 10)
        const totalSeconds = hours * 3600 + minutes * 60 + seconds
        return totalSeconds >= 60 // Filter out videos shorter than 60 seconds (Shorts)
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
