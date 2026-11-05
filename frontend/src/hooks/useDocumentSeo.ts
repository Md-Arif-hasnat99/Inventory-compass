import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SeoConfig {
  title: string;
  description: string;
  keywords?: string;
  ogType?: string;
}

const ROUTE_SEO: Record<string, SeoConfig> = {
  '/': {
    title: 'Inventory Compass — Retail Inventory Planning',
    description:
      'Retail demand forecasting and replenishment planning. Review sales history, forecast product demand, and calculate replenishment needs from one clear workspace.',
    keywords: 'retail inventory, demand forecasting, replenishment planning, reorder point, safety stock',
  },
  '/workspace/overview': {
    title: 'Overview | Inventory Compass',
    description:
      'Monitor demand trajectory, critical stockout risk alerts, and operational inventory health across stores from a single overview.',
  },
  '/workspace/upload': {
    title: 'Upload Sales Data | Inventory Compass',
    description:
      'Upload your retail sales history CSV to generate demand forecasts, calculate reorder points, and plan replenishment.',
  },
  '/workspace/forecasts': {
    title: 'Demand Forecasts | Inventory Compass',
    description:
      'Multi-horizon predictive demand projections with historical context and replenishment-focused planning.',
  },
  '/workspace/inventory': {
    title: 'Replenishment | Inventory Compass',
    description:
      'Automated purchase order recommendations based on lead-time demand, safety buffers, and stockout risk tiers.',
  },
  '/workspace/replenishment': {
    title: 'Replenishment | Inventory Compass',
    description:
      'Automated purchase order recommendations based on lead-time demand, safety buffers, and stockout risk tiers.',
  },
  '/workspace/products': {
    title: 'Products | Inventory Compass',
    description:
      'Retailer product catalog with historical velocity, replenishment lead times, and stock coverage context.',
  },
  '/workspace/guide': {
    title: 'Inventory Guide | Inventory Compass',
    description:
      'Plain-English guide to inventory terminology: reorder points, safety stock, lead times, and demand planning.',
  },
  '/workspace/settings': {
    title: 'Settings | Inventory Compass',
    description: 'Configure forecasting horizons, service level targets, and display preferences.',
  },
  '/workspace/terms': {
    title: 'Terms & Conditions | Inventory Compass',
    description:
      'Terms and conditions for using Inventory Compass, including forecast accuracy limits and user responsibilities.',
  },
};

const DEFAULT_SEO: SeoConfig = {
  title: 'Inventory Compass — Retail Inventory Planning',
  description:
    'Retail demand forecasting and replenishment planning. Review sales history, forecast product demand, and calculate replenishment needs from one clear workspace.',
};

export function useDocumentSeo() {
  const location = useLocation();

  useEffect(() => {
    const config = ROUTE_SEO[location.pathname] || DEFAULT_SEO;

    document.title = config.title;

    const updateMeta = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    updateMeta('description', config.description);
    if (config.keywords) {
      updateMeta('keywords', config.keywords);
    }

    updateMeta('og:title', config.title, true);
    updateMeta('og:description', config.description, true);
    updateMeta('og:url', window.location.href, true);
    updateMeta('og:type', config.ogType || 'website', true);

    updateMeta('twitter:title', config.title);
    updateMeta('twitter:description', config.description);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', window.location.origin + location.pathname);
  }, [location.pathname]);
}
