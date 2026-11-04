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
    title: 'Overview Dashboard — Inventory Compass',
    description: 'Monitor real-time retail demand trajectory, critical stockout risk alerts, and operational inventory health across stores.',
    keywords: 'retail dashboard, inventory metrics, stockout alerts, retail demand overview',
  },
  '/dashboard': {
    title: 'Overview Dashboard — Inventory Compass',
    description: 'Monitor real-time retail demand trajectory, critical stockout risk alerts, and operational inventory health across stores.',
    keywords: 'retail dashboard, inventory metrics, stockout alerts, retail demand overview',
  },
  '/upload': {
    title: 'Upload Data — Inventory Compass',
    description: 'Upload your retail transaction CSV to automatically generate demand forecasts, calculate reorder points, and optimize safety stock.',
    keywords: 'retail CSV upload, sales history upload, inventory data ingestion',
  },
  '/forecast': {
    title: 'Demand Forecasting Intelligence — Inventory Compass',
    description: 'Multi-horizon predictive demand projections with uncertainty confidence bounds, daily sales velocity, and seasonal peak detection.',
    keywords: 'demand forecasting, sales projection, predictive inventory, forecast horizon, retail forecasting',
  },
  '/inventory': {
    title: 'Inventory Management & Stock Health — Inventory Compass',
    description: 'Track SKU stock levels, supplier lead times, reorder thresholds, and days of supply coverage across all retail locations.',
    keywords: 'inventory management, stock monitoring, days of supply, SKU tracking, safety buffer',
  },
  '/inventory/replenishment': {
    title: 'Replenishment Actions & Purchase Planning — Inventory Compass',
    description: 'Automated purchase order recommendations based on lead-time demand, safety buffers, and stockout risk tiers. Export PO drafts to CSV.',
    keywords: 'inventory replenishment, purchase order recommendations, reorder point calculation, PO draft export',
  },
  '/products': {
    title: 'Products Catalog — Inventory Compass',
    description: 'Comprehensive retail catalog with historical velocity, unit prices, holding cost ratios, and replenishment lead times.',
    keywords: 'product catalog, retail SKUs, merchandise inventory, product velocity',
  },
  '/guide': {
    title: 'Terms & Inventory Clarifications Guide — Inventory Compass',
    description: 'Plain-English guide to inventory terminology: Reorder Points (ROP), Safety Stock, EOQ, Lead Times, and interactive ROP simulator.',
    keywords: 'inventory glossary, reorder point formula, safety stock definition, EOQ guide, retail terms',
  },
  '/settings': {
    title: 'System Settings — Inventory Compass',
    description: 'Configure store parameters, supplier defaults, service level targets, and forecasting horizons.',
  },
};

export function useDocumentSeo() {
  const location = useLocation();

  useEffect(() => {
    const config = ROUTE_SEO[location.pathname] || {
      title: 'Inventory Compass — Navigate Demand. Optimize Inventory.',
      description: 'Retail demand forecasting and automated replenishment planning for data-driven inventory decisions.',
    };

    // Update document title
    document.title = config.title;

    // Helper to update or create meta tags
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

    // Update standard SEO meta tags
    updateMeta('description', config.description);
    if (config.keywords) {
      updateMeta('keywords', config.keywords);
    }

    // Update OpenGraph tags
    updateMeta('og:title', config.title, true);
    updateMeta('og:description', config.description, true);
    updateMeta('og:url', window.location.href, true);
    updateMeta('og:type', config.ogType || 'website', true);

    // Update Twitter Card tags
    updateMeta('twitter:title', config.title);
    updateMeta('twitter:description', config.description);

    // Update canonical link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', window.location.origin + location.pathname);
  }, [location.pathname]);
}
