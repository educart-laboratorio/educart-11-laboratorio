import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = 'https://educart.pro';
  return [
    { url: origin+'/', changeFrequency: 'weekly', priority: 1 },
    { url: origin+'/formacao', changeFrequency: 'weekly', priority: 0.9 },
    { url: origin+'/inscricao', changeFrequency: 'monthly', priority: 0.8 },
  ];
}
