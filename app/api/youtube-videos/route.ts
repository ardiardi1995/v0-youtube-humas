export async function GET() {
  try {
    const channelHandle = "@HumasGowa"

    // Fetch halaman channel
    const channelUrl = `https://www.youtube.com/${channelHandle}/videos`
    const response = await fetch(channelUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch channel page")
    }

    const html = await response.text()

    // Extract video data dari ytInitialData
    const ytInitialDataMatch = html.match(/var ytInitialData = ({.+?});/)
    if (!ytInitialDataMatch) {
      throw new Error("Could not find video data")
    }

    const data = JSON.parse(ytInitialDataMatch[1])

    // Navigate to video list
    const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || []
    const videosTab = tabs.find((tab: any) => tab.tabRenderer?.title === "Videos" || tab.tabRenderer?.selected === true)

    const videoItems = videosTab?.tabRenderer?.content?.richGridRenderer?.contents || []

    const videos = videoItems
      .filter((item: any) => item.richItemRenderer?.content?.videoRenderer)
      .map((item: any) => {
        const video = item.richItemRenderer.content.videoRenderer
        return {
          id: video.videoId,
          title: video.title.runs?.[0]?.text || video.title.simpleText || "",
          url: `https://www.youtube-nocookie.com/embed/${video.videoId}?rel=0&showinfo=0&enablejsapi=1`,
        }
      })
      .slice(0, 5)

    return Response.json({ videos })
  } catch (error) {
    console.error("[v0] Error fetching YouTube videos:", error)
    return Response.json({ error: "Failed to fetch videos", videos: [] }, { status: 500 })
  }
}
