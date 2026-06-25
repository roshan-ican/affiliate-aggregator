import { Product, AffiliateLink } from '../types';

interface FlipkartConfig {
  affiliateId: string;
  trackingId?: string;
}

export class FlipkartLinkGenerator {
  private config: FlipkartConfig;

  constructor(config: FlipkartConfig) {
    this.config = config;
  }

  private extractProductId(url: string): string | null {
    const idRegex = /\/p\/([A-Z0-9]+)/i;
    const match = url.match(idRegex);
    return match ? match[1] : null;
  }

  private extractProductPath(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.origin + urlObj.pathname;
    } catch (e) {
      console.error(`[Flipkart] Invalid URL: ${url}`, e);
      return null;
    }
  }

  generateAffiliateUrl(product: Product): AffiliateLink | null {
    const productPath = this.extractProductPath(product.url);
    const productId = this.extractProductId(product.url);

    if (!productPath || !productId) {
      console.warn(`[Flipkart] Failed to extract product ID: ${product.title}`);
      return null;
    }

    const affiliateUrl = `${productPath}?affid=${this.config.affiliateId}`;

    return {
      product: {
        ...product,
        flipkartId: productId,
        url: productPath,
      },
      affiliateUrl,
      affiliateId: this.config.affiliateId,
      platform: 'flipkart',
      cleanedAt: new Date(),
    };
  }

  generateAffiliateUrlsBatch(products: Product[]): AffiliateLink[] {
    return products
      .map(product => this.generateAffiliateUrl(product))
      .filter((link): link is AffiliateLink => link !== null);
  }
}
