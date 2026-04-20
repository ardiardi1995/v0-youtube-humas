"use client"

import { useEffect, useState, useRef } from "react"
import Script from "next/script"

interface Video {
  id: string
  title: string
  url: string
}

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

export default function VideoPlayer() {
  const [videos, setVideos] = useState<Video[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const playersRef = useRef<any[]>([])

  useEffect(() => {
    loadVideos()
    scheduleDailyUpdate()
  }, [])

  useEffect(() => {
    if (videos.length > 0) {
      const interval = setInterval(() => {
        if (!isPlaying) {
          setCurrentSlide((prev) => (prev + 1) % videos.length)
        }
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [videos.length, isPlaying])

  useEffect(() => {
    playersRef.current.forEach((player) => {
      if (player && typeof player.stopVideo === "function") {
        player.stopVideo()
      }
    })
    setIsPlaying(false)
  }, [currentSlide])

  async function loadVideos() {
    try {
      console.log("[v0] Loading videos...")
      setLoading(true)
      setError(null)

      const res = await fetch("/api/youtube-videos")
      const data = await res.json()

      console.log("[v0] Fetched videos:", data.videos)

      if (data.error) {
        throw new Error(data.error)
      }

      setVideos(data.videos || [])
      setLoading(false)

      if (typeof window !== "undefined" && data.videos?.length > 0) {
        initYouTubeAPI()
      }
    } catch (err) {
      console.error("[v0] Failed to load videos:", err)
      setError("Gagal memuat video dari YouTube")
      setLoading(false)
    }
  }

  function scheduleDailyUpdate() {
    const now = new Date()
    const witaOffset = 8 * 60 * 60 * 1000
    const nowWita = new Date(now.getTime() + witaOffset - now.getTimezoneOffset() * 60 * 1000)

    const target = new Date(nowWita)
    target.setHours(7, 0, 0, 0)

    if (nowWita >= target) {
      target.setDate(target.getDate() + 1)
    }

    const msUntil7AM = target.getTime() - nowWita.getTime()

    setTimeout(() => {
      loadVideos()
      setInterval(loadVideos, 24 * 60 * 60 * 1000)
    }, msUntil7AM)
  }

  function initYouTubeAPI() {
    if (window.YT && window.YT.Player) {
      setupPlayers()
    } else {
      window.onYouTubeIframeAPIReady = setupPlayers
    }
  }

  function setupPlayers() {
    playersRef.current = []
    const iframes = document.querySelectorAll(".video-iframe")
    iframes.forEach((iframe: any) => {
      const player = new window.YT.Player(iframe, {
        events: {
          onStateChange: (e: any) => {
            if (e.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true)
            } else if (e.data === window.YT.PlayerState.PAUSED || e.data === window.YT.PlayerState.ENDED) {
              setIsPlaying(false)
            }
          },
        },
      })
      playersRef.current.push(player)
    })
  }

  function goToSlide(index: number) {
    setCurrentSlide(index)
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white text-xl font-sans">Memuat video...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white text-xl font-sans text-center px-4">{error}</div>
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white text-xl font-sans">Belum ada video terbaru.</div>
      </div>
    )
  }

  return (
    <>
      <Script src="https://www.youtube.com/iframe_api" strategy="lazyOnload" />

      <div className="fixed inset-0 bg-black overflow-hidden flex items-center justify-center">
        <div className="relative w-full h-full">
          {/* Video Slides */}
          <div className="relative w-full h-full">
            {videos.map((video, index) => (
              <iframe
                key={video.id}
                src={video.url}
                className={`video-iframe absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-screen h-screen border-0 object-cover transition-opacity duration-700 ${
                  index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
                }`}
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            ))}
          </div>

          {/* Dots Navigation */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2.5 z-20">
            {videos.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-all cursor-pointer ${
                  index === currentSlide ? "bg-white" : "bg-white/40 hover:bg-white/60"
                }`}
                aria-label={`Go to video ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
