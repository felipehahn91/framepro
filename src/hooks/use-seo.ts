import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
}

const updateMetaTag = (attribute: string, key: string, content: string) => {
  let meta = document.querySelector(`meta[${attribute}="${key}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attribute, key);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
};

export function useSEO({ title, description, image }: SEOProps) {
  useEffect(() => {
    if (title) {
      const fullTitle = `${title} | Frame Pro`;
      document.title = fullTitle;
      updateMetaTag('name', 'title', fullTitle);
      updateMetaTag('property', 'og:title', fullTitle);
      updateMetaTag('name', 'twitter:title', fullTitle);
    }

    if (description) {
      updateMetaTag('name', 'description', description);
      updateMetaTag('property', 'og:description', description);
      updateMetaTag('name', 'twitter:description', description);
    }

    if (image) {
      updateMetaTag('property', 'og:image', image);
      updateMetaTag('name', 'twitter:image', image);
    }
  }, [title, description, image]);
}