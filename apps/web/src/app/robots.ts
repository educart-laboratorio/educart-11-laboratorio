import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/formacao', '/inscricao'],
      disallow: ['/admin', '/minha-educart', '/inscricao-previa', '/niveis-demo', '/api/'],
    },
    sitemap: 'https://educart.pro/sitemap.xml',
    host: 'https://educart.pro',
  };
}
