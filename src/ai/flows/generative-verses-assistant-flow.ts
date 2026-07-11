
'use server';
/**
 * @fileOverview An AI assistant that helps users find specific recitation segments from Saleh Al-Dirazi's collection based on spiritual themes or keywords in Arabic.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input Schema
const GenerativeVersesAssistantInputSchema = z.object({
  query: z
    .string()
    .describe('المواضيع الروحية أو الكلمات المفتاحية للبحث عن مقاطع القصائد.'),
});
export type GenerativeVersesAssistantInput = z.infer<
  typeof GenerativeVersesAssistantInputSchema
>;

// Output Schema
const GenerativeVersesAssistantOutputSchema = z.object({
  recitationSegments: z
    .array(
      z.object({
        title: z
          .string()
          .describe('عنوان مقطع القصيدة.'),
        segmentText: z
          .string()
          .describe('نص المقطع الشعري.'),
        audioUrl: z
          .string()
          .url()
          .describe('رابط الملف الصوتي لهذا المقطع.'),
      })
    )
    .describe(
      'قائمة بمقاطع القصائد ذات الصلة مع عناوينها ونصوصها وروابط الصوت.'
    ),
});
export type GenerativeVersesAssistantOutput = z.infer<
  typeof GenerativeVersesAssistantOutputSchema
>;

// Prompt Definition
const generativeVersesAssistantPrompt = ai.definePrompt({
  name: 'generativeVersesAssistantPrompt',
  input: {schema: GenerativeVersesAssistantInputSchema},
  output: {schema: GenerativeVersesAssistantOutputSchema},
  prompt: `أنت مساعد ذكاء اصطناعي متخصص في قصائد الرادود صالح الدرازي. مهمتك هي العثور على مقاطع قصائد ذات صلة بناءً على المواضيع الروحية أو الكلمات المفتاحية التي يطلبها المستخدم باللغة العربية.

المستخدم يطلب البحث عن مقاطع متعلقة بـ: "{{{query}}}".

يرجى تقديم قائمة من 1 إلى 3 مقاطع ذات صلة من مجموعة صالح الدرازي. لكل مقطع، قدم عنواناً، والنص الفعلي للمقطع، ورابط صوتي افتراضي يبدأ بـ 'https://example.com/audio/'.

أمثلة من مواضيع صالح الدرازي:
- "نداء الأذان"
- "آيات الاستغفار"
- "دعاء الهداية"
- "تسابيح الخالق"
- "أنين كربلاء"

يجب أن تكون المخرجات باللغة العربية وبالتنسيق المطلوب.`,
});

// Flow Definition
const generativeVersesAssistantFlow = ai.defineFlow(
  {
    name: 'generativeVersesAssistantFlow',
    inputSchema: GenerativeVersesAssistantInputSchema,
    outputSchema: GenerativeVersesAssistantOutputSchema,
  },
  async input => {
    const {output} = await generativeVersesAssistantPrompt(input);
    if (!output) {
      throw new Error('Failed to generate recitation segments.');
    }
    return output;
  }
);

// Wrapper function
export async function generativeVersesAssistant(
  input: GenerativeVersesAssistantInput
): Promise<GenerativeVersesAssistantOutput> {
  return generativeVersesAssistantFlow(input);
}
