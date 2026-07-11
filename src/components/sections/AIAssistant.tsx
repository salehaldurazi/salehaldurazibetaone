
"use client";

import React, { useState } from "react";
import { FadeInSection } from "../FadeInSection";
import { Search, Sparkles, PlayCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { generativeVersesAssistant, type GenerativeVersesAssistantOutput } from "@/ai/flows/generative-verses-assistant-flow";

export function AIAssistant() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GenerativeVersesAssistantOutput | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const data = await generativeVersesAssistant({ query });
      setResults(data);
    } catch (error) {
      console.error("Failed to fetch recitation segments:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-32 bg-secondary/5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      
      <div className="container max-w-4xl px-6 mx-auto">
        <FadeInSection className="text-center mb-12 space-y-4">
          <div className="flex items-center justify-center space-x-2 space-x-reverse text-primary">
            <Sparkles className="w-5 h-5" />
            <span className="text-xs uppercase tracking-[0.4em]">بحث مدعوم بالذكاء الاصطناعي</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-light">مساعد الأبيات</h2>
          <p className="text-foreground/60">ابحث عن القصائد من خلال المواضيع الروحية أو الكلمات المفتاحية.</p>
        </FadeInSection>

        <FadeInSection delay={200}>
          <form onSubmit={handleSearch} className="flex gap-2 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
              <Input
                placeholder="مثلاً: الصبر، الأمل، الصباح، السكينة..."
                className="pr-11 bg-card border-primary/20 focus:border-primary transition-all h-14 rounded-full"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button 
              type="submit" 
              disabled={loading}
              className="h-14 px-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium tracking-wider"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "اكتشف"}
            </Button>
          </form>
        </FadeInSection>

        {results && (
          <div className="mt-16 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h3 className="text-center text-sm uppercase tracking-widest text-primary/60 mb-8">المقاطع المقترحة</h3>
            <div className="grid gap-6">
              {results.recitationSegments.map((seg, i) => (
                <Card key={i} className="bg-card/50 border-primary/5 hover:border-primary/20 transition-all">
                  <CardContent className="p-6 flex items-start space-x-6 space-x-reverse text-right">
                    <div className="pt-1">
                      <PlayCircle className="w-10 h-10 text-primary cursor-pointer hover:scale-110 transition-transform" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="text-lg font-medium">{seg.title}</h4>
                      <p className="text-sm text-foreground/60 italic">"{seg.segmentText}"</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
