
"use client";

import { FadeInSection } from "../FadeInSection";
import Image from "next/image";

export function Biography() {

  return (
    <section id="biography" className="py-32 scroll-mt-nav container max-w-5xl px-6 mx-auto">
      <FadeInSection className="grid md:grid-cols-2 gap-16 items-center">
        <div className="relative aspect-square rounded-2xl overflow-hidden border border-primary/20 p-1 bg-gradient-to-br from-primary/10 to-transparent">
          <div className="relative w-full h-full rounded-xl overflow-hidden shadow-2xl">
            <Image src="https://i.postimg.cc/HnY2XNSd/profile.jpg"
              alt="Saleh Al-Dirazi Logo"
              fill
              className="object-cover grayscale hover:grayscale-0 transition-all duration-1000 ease-in-out"
              data-ai-hint="man portrait black white"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-2">
            <span className="text-primary uppercase text-xs">إرث من التفاني</span>
            <h2 className="text-4xl md:text-5xl font-light">الحياة والمسيرة</h2>
          </div>

          <div className="space-y-6 text-foreground/70 leading-relaxed font-light text-lg">
            <p>
              يعد صالح الدرازي أحد أبرز الأصوات في عالم الرواديد والمداحين. ولد في البحرين، وبدأت رحلته في سن مبكرة، مدفوعاً بارتباط روحي عميق بالرسالة التي يقدمها.
            </p>
            <p>
              يتميز أسلوبه بمزيج فريد من الأصالة التقليدية والرنين العاطفي المعاصر. من خلال صوته، يجسد الجسر بين السرديات التاريخية والقلوب المعاصرة، مما جعلله شخصية محبوبة عالمياً.
            </p>
            <p>
              على مدى عقود، كرس صالح حياته للحفاظ على التراث الغني للقصيدة الحسينية، مؤثراً في جيل جديد من المنشدين ببراعته التقنية وصدقه العميق.
            </p>
          </div>
        </div>
      </FadeInSection>
    </section>
  );
}
