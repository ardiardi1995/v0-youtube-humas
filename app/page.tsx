"use client"

import { useEffect, useState, useRef } from "react"
import Image from "next/image"

interface Video {
  id: string
  title: string
  thumbnail: string
  url: string
}

export default function VideoPlayer() {
  const [videos, setVideos] = useState<Video[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const slideTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadVideos()
    scheduleDailyUpdate()
  }, [])

  useEffect(() => {
    if (videos.length > 0 && slideTimerRef.current === null) {
      slideTimerRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % videos.length)
      }, 5000)
    }
    return () => {
      if (slideTimerRef.current) {
        clearInterval(slideTimerRef.current)
        slideTimerRef.current = null
      }
    }
  }, [videos.length])

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
    } catch (err) {
      console.error("[v0] Failed to load videos:", err)
      setError("Gagal memuat video dari YouTube")
    } finally {
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

  function goToSlide(index: number) {
    setCurrentSlide(index)
  }

  function openVideoFullscreen(videoId: string) {
    window.open(
      `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&showinfo=0`,
      "youtube",
      "width=1280,height=720,resizable=yes,scrollbars=no"
    )
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

  const currentVideo = videos[currentSlide]

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden">
      <div className="relative w-full h-full flex flex-col items-center justify-center">
        {/* Video Thumbnail Slide */}
        <div className="relative w-full h-full group">
          <Image
            src={currentVideo.thumbnail}
            alt={currentVideo.title}
            fill
            className="object-cover"
            priority
          />

          {/* Play Button Overlay */}
          <button
            onClick={() => openVideoFullscreen(currentVideo.id)}
            className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors"
          >
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-red-600 shadow-lg hover:bg-red-700 transition-colors">
              <svg
                className="w-10 h-10 text-white ml-1"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </button>

          {/* Video Title */}
          <div className="absolute bottom-20 left-0 right-0 px-6 py-4 bg-gradient-to-t from-black to-transparent">
            <h2 className="text-white text-2xl font-bold truncate">{currentVideo.title}</h2>
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
    </div>
  )
}
