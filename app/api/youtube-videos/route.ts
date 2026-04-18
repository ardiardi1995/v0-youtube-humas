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

    // Step 4: Check each video's aspect ratio using oEmbed API (parallel requests)
    const videoItems = videosData.items || []
    
    const oembedResults = await Promise.all(
      videoItems.map(async (item: any) => {
        const videoId = item.id
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`

        try {
          const oembedResponse = await fetch(oembedUrl, { 
            signal: AbortSignal.timeout(5000) // 5 second timeout per request
          })
          if (oembedResponse.ok) {
            const oembedData = await oembedResponse.json()
            const width = oembedData.width || 0
            const height = oembedData.height || 0

            if (width > 0 && height > 0) {
              const aspectRatio = width / height
              // 16:9 = 1.77, accept ratio > 1.2 (horizontal videos)
              if (aspectRatio > 1.2) {
                return {
                  id: item.id,
                  title: item.snippet.title,
                  thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
                  url: `https://www.youtube-nocookie.com/embed/${item.id}?rel=0&showinfo=0&enablejsapi=1`,
                }
              }
            }
          }
        } catch (err) {
          // Ignore timeout/fetch errors for individual videos
        }
        return null
      })
    )

    // Filter out nulls and take first 5
    const videos = oembedResults.filter((v): v is NonNullable<typeof v> => v !== null).slice(0, 5)

    return NextResponse.json({ videos })
  } catch (error) {
    console.error("Error fetching YouTube videos:", error)
    return NextResponse.json(
      { error: "Gagal memuat video dari YouTube", videos: [] },
      { status: 500 }
    )
  }
}
