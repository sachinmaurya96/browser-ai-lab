import { useCallback, useEffect, useRef, useState } from 'react'

export type CamState = 'off' | 'starting' | 'live' | 'denied' | 'missing' | 'error'
export type Facing = 'user' | 'environment'

/** Thin wrapper around getUserMedia that always cleans up its tracks. */
export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [state, setState] = useState<CamState>('off')
  const [facing, setFacing] = useState<Facing>('user')
  const [message, setMessage] = useState<string | null>(null)
  const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

  const release = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }

  const start = useCallback(async (want: Facing = facing) => {
    if (!supported) {
      setState('missing')
      setMessage('This browser cannot access a camera. Use a secure (https) page in a modern browser.')
      return
    }
    release()
    setState('starting')
    setMessage(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: want, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      setFacing(want)
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play().catch(() => undefined)
      }
      setState('live')
    } catch (e) {
      const name = (e as DOMException).name
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setState('denied')
        setMessage('Camera permission was blocked. Allow it from the address bar and try again.')
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setState('missing')
        setMessage('No camera was found on this device.')
      } else {
        setState('error')
        setMessage((e as Error).message || 'The camera could not be started.')
      }
    }
  }, [facing, supported])

  const stop = useCallback(() => {
    release()
    setState('off')
  }, [])

  useEffect(() => () => release(), [])

  /** Grab the current frame as a JPEG data URL, capped at `maxSide` pixels. */
  const snapshot = useCallback((maxSide = 640) => {
    const v = videoRef.current
    if (!v || !v.videoWidth) return null
    const scale = Math.min(1, maxSide / Math.max(v.videoWidth, v.videoHeight))
    const c = document.createElement('canvas')
    c.width = Math.round(v.videoWidth * scale)
    c.height = Math.round(v.videoHeight * scale)
    c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.85)
  }, [])

  return { videoRef, state, facing, message, supported, start, stop, snapshot }
}
