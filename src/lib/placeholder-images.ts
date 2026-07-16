// src/lib/placeholder-images.ts
export interface ImagePlaceholder {
  id: string;
  description: string;
  imageHint: string;
  imageUrlDark: string;  // Add this
  imageUrlLight: string; // Add this
  // Remove the old 'imageUrl' if it's no longer used
}

export const PlaceHolderImages: ImagePlaceholder[] = [
  {
    "id": "hero-1",
    "description": "أجواء روحية - صالح الدرازي",
    "imageUrlDark": "https://pub-4e74282116ce42688fee67ca11592467.r2.dev/img/1b.png",
    "imageUrlLight": "https://pub-4e74282116ce42688fee67ca11592467.r2.dev/img/1w.png",
    "imageHint": "spiritual mosque"
  },
  {
    "id": "hero-2",
    "description": "تلاوة وخشوع - صالح الدرازي",
    "imageUrlDark": "https://pub-4e74282116ce42688fee67ca11592467.r2.dev/img/2b.png",
    "imageUrlLight": "https://pub-4e74282116ce42688fee67ca11592467.r2.dev/img/2w.png",
    "imageHint": "islamic architecture"
  },
  {
    "id": "hero-3",
    "description": "إرث فني - صالح الدرازي",
    "imageUrlDark": "https://pub-4e74282116ce42688fee67ca11592467.r2.dev/img/3b.png",
    "imageUrlLight": "https://pub-4e74282116ce42688fee67ca11592467.r2.dev/img/3w.png",
    "imageHint": "arabic pattern"
  }
];