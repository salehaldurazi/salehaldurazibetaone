
"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { FadeInSection } from "../FadeInSection";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

export function Hero() {
  // جلب أول 3 صور تبدأ بكلمة hero من ملف البيانات
  const heroImages = PlaceHolderImages.filter(img => img.id.startsWith('hero-')).slice(0, 3);

  const plugin = useRef(
    Autoplay({ delay: 5000, stopOnInteraction: false })
  );

  return (
    <section id="home" className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-[#0f0e0c]">

      {/* منزلق الصور كخلفية كاملة للقسم */}
      <Carousel
        plugins={[plugin.current]}
        className="absolute inset-0 w-full h-full z-0"
        opts={{
          align: "start",
          loop: true,
          direction: "rtl",
          skipSnaps: false,
        }}
      >
        <CarouselContent className="ml-0 h-screen">
          {heroImages.map((img, index) => (
            <CarouselItem key={index} className="pl-0 h-full w-full basis-full">
              <div className="relative w-full h-full overflow-hidden">
                <Image
                  src={img.imageUrl}
                  alt={img.description}
                  fill
                  className="object-cover scale-110 transition-transform duration-[3000ms] ease-out"
                  priority={index === 0}
                  data-ai-hint={img.imageHint}
                />
                {/* طبقة تظليل داكنة لضمان وضوح النص */}
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      <div className="relative z-10 flex flex-col items-center justify-center px-6 w-full h-full">
        <FadeInSection className="animate-in fade-in zoom-in duration-1000">
          <div className="relative w-[120px] h-[120px] md:w-[180px] md:h-[180px]">
            <Image src="https://pub-4e74282116ce42688fee67ca11592467.r2.dev/img/logo.png"
              alt="Saleh Al-Dirazi Logo"
              fill
              className="object-contain drop-shadow-[0_0_20px_rgba(197,160,89,0.3)]"
              priority
            />
          </div>
        </FadeInSection>
      </div>

      {/* Gradient Overlays for Depth and Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a09] via-[#0a0a09]/60 to-transparent" />
      <div className="absolute inset-0 bg-black/40" />

      {/* توهج خلفي ناعم */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-[radial-gradient(circle_at_center,_rgba(197,160,89,0.03),_transparent_70%)] blur-[100px] pointer-events-none -z-10" />
    </section>
  );
}
