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

type Fallback = 'none' | 'ios' | 'manual'

export function InstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isStandalone)
  const [fallback, setFallback] = useState<Fallback>('none')

  useEffect(() => {
    if (isStandalone()) return

    const onPrompt = (e: Event) => {
      e.preventDefault() // keep Chrome's own banner from firing; we show our button
      setDeferred(e as BeforeInstallPromptEvent)
      setFallback('none')
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)

    // iOS/iPadOS never fires beforeinstallprompt at all.
    const ua = navigator.userAgent
    const isIos = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome/.test(ua)

    // Chrome also stays silent when installing is blocked — most often on a
    // supervised/child account. Show manual steps rather than nothing.
    const t = window.setTimeout(() => {
      setDeferred((current) => {
        if (!current) setFallback(isIos && isSafari ? 'ios' : 'manual')
        return current
      })
    }, 3500)

    return () => {
      window.clearTimeout(t)
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

  if (fallback === 'ios') {
    return (
      <p className="install-hint">
        📲 عشان تحطّه على الشاشة: اضغط زرار <strong>المشاركة</strong> تحت، واختار{' '}
        <strong>«إضافة إلى الشاشة الرئيسية»</strong>
      </p>
    )
  }

  if (fallback === 'manual') {
    return (
      <div className="install-hint">
        <p style={{ margin: 0 }}>
          📲 عشان تحطّه على الشاشة الرئيسية: افتح قائمة كروم <strong>⋮</strong> فوق، واختار{' '}
          <strong>«إضافة إلى الشاشة الرئيسية»</strong>
        </p>
        <p className="install-note">
          لو الخيار مش موجود، غالبًا الجهاز على <strong>حساب أطفال</strong> بيمنع تثبيت
          التطبيقات. التطبيق هيشتغل عادي من المتصفح — والقصص اللي فتحتها هتشتغل من غير نت
          برضه.
        </p>
      </div>
    )
  }

  return null
}
