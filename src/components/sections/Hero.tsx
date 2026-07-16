"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { FadeInSection } from "../FadeInSection";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

interface HeroImage {
  id: string;
  description: string;
  imageUrlDark: string;
  imageUrlLight: string;
  imageHint?: string;
}

export function Hero() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  // التأكد من تحميل المكون في المتصفح فقط لحل مشكلة Hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  const heroImages = (PlaceHolderImages as HeroImage[])
    .filter((img) => img.id.startsWith('hero-'))
    .slice(0, 3);

  const plugin = useRef(Autoplay({ delay: 5000, stopOnInteraction: false }));

  // منع الرندرة حتى يتم التحميل لتجنب الومضات أو أخطاء التوافق
  if (!mounted) {
    return <section id="home" className="relative h-screen w-full bg-background" />;
  }

  return (
    <section id="home" className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-background">
      {/* منزلق الصور */}
      <Carousel
        plugins={[plugin.current]}
        className="absolute inset-0 w-full h-full z-0"
        opts={{ loop: true, direction: "rtl" }}
      >
        <CarouselContent className="ml-0 h-screen">
          {heroImages.map((img, index) => (
            <CarouselItem key={index} className="pl-0 h-full w-full basis-full">
              <div className="relative w-full h-full overflow-hidden">
                <Image
                  src={resolvedTheme === 'dark' ? img.imageUrlDark : img.imageUrlLight}
                  alt={img.description}
                  fill
                  className="object-cover scale-110 transition-transform duration-[3000ms] ease-out"
                  priority={index === 0}
                />
                {/* طبقة تظليل ديناميكية */}
                <div className={`absolute inset-0 transition-colors duration-500 ${resolvedTheme === 'dark' ? 'bg-black/60' : 'bg-white/20'}`} />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* المحتوى (اللوجو) */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 w-full h-full">
        <FadeInSection className="animate-in fade-in zoom-in duration-1000">
          <div className="relative w-[120px] h-[120px] md:w-[180px] md:h-[180px]">
            <Image
              src="https://pub-4e74282116ce42688fee67ca11592467.r2.dev/img/logo.png"
              alt="Saleh Al-Dirazi Logo"
              fill
              className="object-contain drop-shadow-[0_0_20px_rgba(197,160,89,0.3)]"
              priority
            />
          </div>
        </FadeInSection>
      </div>

      {/* تدرجات ألوان متوافقة مع الثيم */}
      <div className={`absolute inset-0 bg-gradient-to-t ${resolvedTheme === 'dark' ? 'from-background via-background/60' : 'from-background via-background/40'} to-transparent`} />

      {/* طبقة تظليل إضافية للتباين */}
      <div className={`absolute inset-0 ${resolvedTheme === 'dark' ? 'bg-black/40' : 'bg-white/10'}`} />

      {/* توهج خلفي ناعم */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-[radial-gradient(circle_at_center,_rgba(197,160,89,0.03),_transparent_70%)] blur-[100px] pointer-events-none -z-10" />
    </section>
  );
}