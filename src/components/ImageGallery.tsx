
import * as React from "react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { useTranslation } from "react-i18next"

const images = [
  { src: "/carousel_media/IMG_Lokal.JPEG", alt: "Ready Pixel Go Local Space" },
  { src: "/carousel_media/IMG_med_logo.jpeg", alt: "Ready Pixel Go with Logo" },
  { src: "/carousel_media/IMG_7908.jpg", alt: "Game Floor Action" },
  { src: "/carousel_media/IMG_7909.jpg", alt: "Game Floor Blue" },
  { src: "/carousel_media/IMG_7910.jpg", alt: "Game Floor Red" },
  { src: "/carousel_media/IMG_7877(1).PNG", alt: "Game Interface" },
]

export function ImageGallery() {
  const [open, setOpen] = React.useState(false)
  const [currentImage, setCurrentImage] = React.useState<string | null>(null)
  const { t } = useTranslation();

  const handleImageClick = (src: string) => {
    setCurrentImage(src)
    setOpen(true)
  }

  return (
    <section className="w-full pt-6 pb-8 md:pt-28 md:pb-12 bg-muted/10 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background to-transparent pointer-events-none" />
      <div className="container px-4 md:px-6 mx-auto relative z-10">
        <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center mb-12">
          {t('gallery.title')}
        </h2>
        
        <div className="relative w-full max-w-5xl mx-auto px-12">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {images.map((image, index) => (
                <CarouselItem key={index} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                  <div className="p-1 h-full">
                    <Card 
                      className="cursor-pointer hover:opacity-90 transition-all hover:scale-[1.02] h-full overflow-hidden border-0 shadow-md" 
                      onClick={() => handleImageClick(image.src)}
                    >
                      <CardContent className="flex aspect-[9/16] items-center justify-center p-0">
                         <img 
                          src={image.src} 
                          alt={image.alt} 
                          className="w-full h-full object-cover"
                         />
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-0 md:-left-12 bg-background/80 hover:bg-background border-none shadow-sm h-12 w-12" />
            <CarouselNext className="right-0 md:-right-12 bg-background/80 hover:bg-background border-none shadow-sm h-12 w-12" />
          </Carousel>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-5xl w-[90vw] p-0 overflow-hidden bg-black/95 border-none">
             {currentImage && (
                <div 
                  className="relative w-full h-[80vh] flex items-center justify-center p-4 outline-none"
                  onClick={() => setOpen(false)}
                >
                  <img 
                    src={currentImage} 
                    alt="Enlarged view" 
                    className="max-h-full max-w-full object-contain"
                  />
                  <button 
                    onClick={(e) => { e.stopPropagation(); setOpen(false); }}
                    className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full bg-black/20 hover:bg-black/40 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    <span className="sr-only">Close</span>
                  </button>
                </div>
             )}
          </DialogContent>
        </Dialog>
      </div>
    </section>
  )
}
