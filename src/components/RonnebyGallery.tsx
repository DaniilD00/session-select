import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Card, CardContent } from "@/components/ui/card"
import { GalleryImage, buildSrcSet, thumbSrc } from "@/config/gallery"
import { cn } from "@/lib/utils"

// Cards sit 3-up inside a 1024px container on desktop, 2-up on tablets and
// nearly full width on phones.
const CARD_SIZES = "(min-width: 1024px) 320px, (min-width: 768px) 45vw, 90vw"
// The lightbox photo is portrait and height-capped, so it is far narrower than
// the viewport on desktop.
const LIGHTBOX_SIZES = "(min-width: 768px) 40vw, 92vw"

// How far a touch has to travel before it counts as a swipe rather than a tap.
const SWIPE_THRESHOLD_PX = 48

interface PictureProps {
  image: GalleryImage
  alt: string
  sizes: string
  className?: string
  imgClassName?: string
  eager?: boolean
}

// <picture> with the AVIF/WebP variants when the photo has them, over a
// dominant-colour backdrop that shows until the file decodes.
function GalleryPicture({ image, alt, sizes, className, imgClassName, eager }: PictureProps) {
  const imgRef = React.useRef<HTMLImageElement>(null)
  const [loaded, setLoaded] = React.useState(false)

  React.useEffect(() => {
    // A cached image can finish decoding before React attaches onLoad.
    if (imgRef.current?.complete) setLoaded(true)
  }, [image.src])

  const avif = buildSrcSet(image, "avif")
  const webp = buildSrcSet(image, "webp")

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ backgroundColor: image.placeholder ?? "hsl(var(--muted))" }}
    >
      <picture className="flex h-full w-full items-center justify-center">
        {avif && <source type="image/avif" srcSet={avif} sizes={sizes} />}
        {webp && <source type="image/webp" srcSet={webp} sizes={sizes} />}
        <img
          ref={imgRef}
          src={image.src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={cn(
            "h-full w-full transition-opacity duration-500 motion-reduce:transition-none",
            loaded ? "opacity-100" : "opacity-0",
            imgClassName
          )}
        />
      </picture>
    </div>
  )
}

export function RonnebyGallery({ images }: { images: GalleryImage[] }) {
  const { t } = useTranslation()
  const [api, setApi] = React.useState<CarouselApi>()
  const [selectedSnap, setSelectedSnap] = React.useState(0)
  const [snapCount, setSnapCount] = React.useState(0)
  // null = closed. Otherwise the index of the photo on screen.
  const [openIndex, setOpenIndex] = React.useState<number | null>(null)

  const total = images.length
  const isOpen = openIndex !== null
  const captionOf = React.useCallback(
    (image: GalleryImage) => (image.captionKey ? t(image.captionKey) : image.alt),
    [t]
  )

  const step = React.useCallback(
    (delta: number) => setOpenIndex((i) => (i === null ? i : (i + delta + total) % total)),
    [total]
  )

  // Dots track the carousel's own snap points, which differ from the photo
  // count once several cards share a slide.
  React.useEffect(() => {
    if (!api) return
    const sync = () => {
      setSnapCount(api.scrollSnapList().length)
      setSelectedSnap(api.selectedScrollSnap())
    }
    sync()
    api.on("select", sync)
    api.on("reInit", sync)
    return () => {
      api.off("select", sync)
      api.off("reInit", sync)
    }
  }, [api])

  // Arrow keys page through the lightbox; Radix already handles Escape.
  React.useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault()
        step(1)
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        step(-1)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isOpen, step])

  const touchStart = React.useRef<{ x: number; y: number } | null>(null)
  // A swipe still fires a click on touchend, which would close the lightbox.
  const justSwiped = React.useRef(false)

  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0]
    touchStart.current = { x: touch.clientX, y: touch.clientY }
    justSwiped.current = false
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return
    const touch = e.changedTouches[0]
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    if (Math.abs(dx) > SWIPE_THRESHOLD_PX && Math.abs(dx) > Math.abs(dy)) {
      justSwiped.current = true
      step(dx < 0 ? 1 : -1)
    }
  }
  // Empty space around the photo closes; the photo itself does not, so a
  // mis-aimed swipe never dismisses the lightbox.
  const onStageClick = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return
    if (justSwiped.current) {
      justSwiped.current = false
      return
    }
    setOpenIndex(null)
  }

  // Keep the neighbours mounted so paging is instant and the browser fetches
  // them in whichever format it picked for the visible one.
  const mounted =
    openIndex === null
      ? []
      : [(openIndex - 1 + total) % total, openIndex, (openIndex + 1) % total].filter(
          (value, i, all) => all.indexOf(value) === i
        )

  return (
    <section className="w-full pt-6 pb-8 md:pt-28 md:pb-12 bg-muted/10 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background to-transparent pointer-events-none" />
      <div className="container px-4 md:px-6 mx-auto relative z-10">
        <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center mb-3">
          {t("gallery.title")}
        </h2>
        <p className="text-center text-muted-foreground mb-10">{t("gallery.hint")}</p>

        <div className="relative w-full max-w-5xl mx-auto px-12">
          <Carousel opts={{ align: "start", loop: true }} setApi={setApi} className="w-full">
            <CarouselContent className="-ml-2 md:-ml-4">
              {images.map((image, index) => (
                <CarouselItem key={image.src} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                  <div className="p-1 h-full">
                    <Card className="h-full overflow-hidden border-0 shadow-md">
                      <CardContent className="p-0">
                        <button
                          type="button"
                          onClick={() => setOpenIndex(index)}
                          aria-label={t("gallery.openImage", { caption: captionOf(image) })}
                          className="group relative block w-full aspect-[9/16] cursor-zoom-in overflow-hidden rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          <GalleryPicture
                            image={image}
                            alt={captionOf(image)}
                            sizes={CARD_SIZES}
                            eager={index === 0}
                            className="h-full w-full"
                            imgClassName="object-cover transition-transform duration-500 group-hover:scale-105 group-focus-visible:scale-105 motion-reduce:transform-none"
                          />
                          {/* Nothing is written over the photo — the expand
                              affordance only appears on hover/focus. The
                              caption lives in the lightbox, under the photo. */}
                          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/40 p-2 text-white opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                            <Expand className="h-4 w-4" />
                          </span>
                        </button>
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-0 md:-left-12 bg-background/80 hover:bg-background border-none shadow-sm h-12 w-12" />
            <CarouselNext className="right-0 md:-right-12 bg-background/80 hover:bg-background border-none shadow-sm h-12 w-12" />
          </Carousel>

          {/* Position indicator — the carousel loops, so there is no other cue
              for how far through the set you are. */}
          {snapCount > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              {Array.from({ length: snapCount }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => api?.scrollTo(i)}
                  aria-label={t("gallery.goToSlide", { number: i + 1 })}
                  aria-current={i === selectedSnap}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    i === selectedSnap
                      ? "w-6 bg-primary"
                      : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                  )}
                />
              ))}
            </div>
          )}
        </div>

        <DialogPrimitive.Root open={isOpen} onOpenChange={(next) => !next && setOpenIndex(null)}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <DialogPrimitive.Content
              aria-describedby={undefined}
              className="fixed inset-0 z-[120] flex flex-col outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
            >
              <DialogPrimitive.Title className="sr-only">{t("gallery.title")}</DialogPrimitive.Title>

              {openIndex !== null && (
                <>
                  <div className="pointer-events-none relative z-10 flex items-center justify-between p-4 md:p-6">
                    <span className="pointer-events-auto rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium tabular-nums text-white backdrop-blur-sm">
                      {t("gallery.counter", { current: openIndex + 1, total })}
                    </span>
                    <DialogPrimitive.Close
                      aria-label={t("gallery.close")}
                      className="pointer-events-auto rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <X className="h-5 w-5" />
                    </DialogPrimitive.Close>
                  </div>

                  <div
                    className="relative z-10 flex min-h-0 flex-1 cursor-zoom-out items-center justify-center px-2 md:px-20"
                    onTouchStart={onTouchStart}
                    onTouchEnd={onTouchEnd}
                    onClick={onStageClick}
                  >
                    <button
                      type="button"
                      onClick={() => step(-1)}
                      aria-label={t("gallery.previous")}
                      className="absolute left-1 md:left-4 z-20 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>

                    {/* The layers stay mounted so paging is instant. Only the
                        photo itself takes pointer events — the space around it
                        belongs to the close-on-click stage above. */}
                    <div className="pointer-events-none relative h-full w-full">
                      {mounted.map((index) => (
                        <GalleryPicture
                          key={images[index].src}
                          image={images[index]}
                          alt={captionOf(images[index])}
                          sizes={LIGHTBOX_SIZES}
                          eager
                          className={cn(
                            "pointer-events-none absolute inset-0 !bg-transparent transition-opacity duration-300 motion-reduce:transition-none",
                            index === openIndex ? "opacity-100" : "opacity-0"
                          )}
                          imgClassName={cn(
                            "h-auto max-h-full w-auto max-w-full cursor-default object-contain",
                            index === openIndex ? "pointer-events-auto" : "pointer-events-none"
                          )}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => step(1)}
                      aria-label={t("gallery.next")}
                      className="absolute right-1 md:right-4 z-20 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="relative z-10 shrink-0 px-4 pb-5 pt-3 md:pb-8">
                    <p className="mb-4 text-center text-sm text-white/85 md:text-base">
                      {captionOf(images[openIndex])}
                    </p>
                    {/* Jump straight to any photo instead of paging through. */}
                    <div className="flex justify-center gap-2 overflow-x-auto pb-1">
                      {images.map((image, index) => (
                        <button
                          key={image.src}
                          type="button"
                          onClick={() => setOpenIndex(index)}
                          aria-label={t("gallery.openImage", { caption: captionOf(image) })}
                          aria-current={index === openIndex}
                          className={cn(
                            "h-14 w-9 shrink-0 overflow-hidden rounded-md ring-offset-2 ring-offset-black transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white md:h-16 md:w-10",
                            index === openIndex
                              ? "opacity-100 ring-2 ring-white"
                              : "opacity-50 hover:opacity-90"
                          )}
                        >
                          <img
                            src={thumbSrc(image)}
                            alt=""
                            aria-hidden="true"
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </div>
    </section>
  )
}
