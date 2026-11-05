import React from 'react';
import { useDocumentSeo } from '../hooks/useDocumentSeo';

/**
 * Route-level SEO sync. Mounts once inside the router so every active
 * route updates the document title, meta description, OpenGraph, Twitter,
 * and canonical tags from the central ROUTE_SEO map.
 */
export const SeoSync: React.FC = () => {
  useDocumentSeo();
  return null;
};
