import { useEffect, useState } from 'react'

/**
 * Chrome fires this instead of showing its own install UI, letting the page
 * decide when to ask. Not in lib.dom yet, so it is typed here.
 */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  // iOS Safari reports installed state here instead
  (navigator as unknown as { standalone?: boolean }).standalone === true

export function InstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isStandalone)
  const [showIosHelp, setShowIosHelp] = useState(false)

  useEffect(() => {
    if (isStandalone()) return

    const onPrompt = (e: Event) => {
      e.preventDefault() // keep Chrome's own banner from firing; we show our button
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)

    // iOS/iPadOS never fires beforeinstallprompt — offer manual steps instead.
    const ua = navigator.userAgent
    const isIos = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome/.test(ua)
    if (isIos && isSafari) setShowIosHelp(true)

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return null

  if (deferred) {
    return (
      <button
        type="button"
        className="install-btn"
        onClick={async () => {
          await deferred.prompt()
          const { outcome } = await deferred.userChoice
          if (outcome === 'accepted') setInstalled(true)
          setDeferred(null)
        }}
      >
        <span aria-hidden>⬇️</span> ثبّت التطبيق على الجهاز
      </button>
    )
  }

  if (showIosHelp) {
    return (
      <p className="install-hint">
        📲 عشان تثبّت التطبيق: اضغط زرار المشاركة <strong>􀈂</strong> تحت، واختار{' '}
        <strong>«إضافة إلى الشاشة الرئيسية»</strong>
      </p>
    )
  }

  return null
}
