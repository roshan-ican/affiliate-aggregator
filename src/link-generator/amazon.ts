import { Product, AffiliateLink } from '../types';

interface AmazonConfig {
  affiliateId: string;
  domain: string;
}

export class AmazonLinkGenerator {
  private config: AmazonConfig;

  constructor(config: AmazonConfig) {
    this.config = config;
  }

  private extractASIN(url: string | null | undefined): string | null {
    if (!url) return null;
    const asinRegex = /\/dp\/([A-Z0-9]{10})/i;
    const match = url.match(asinRegex);
    return match ? match[1] : null;
  }

  private cleanUrl(url: string): string | null {
    const asin = this.extractASIN(url);
    if (!asin) return null;
    return `https://www.${this.config.domain}/dp/${asin}`;
  }

  generateAffiliateUrl(product: Product): AffiliateLink | null {
    const asin = product.asin || this.extractASIN(product.url);
    if (!asin) {
      console.warn(`[Amazon] No ASIN found for product: ${product.title}`);
      return null;
    }

    const baseUrl = `https://www.${this.config.domain}/dp/${asin}`;
    const affiliateUrl = `${baseUrl}?tag=${this.config.affiliateId}`;

    return {
      product: {
        ...product,
        asin,
        url: baseUrl,
      },
      affiliateUrl,
      affiliateId: this.config.affiliateId,
      platform: 'amazon',
      cleanedAt: new Date(),
    };
  }

  generateAffiliateUrlsBatch(products: Product[]): AffiliateLink[] {
    return products
      .map(product => this.generateAffiliateUrl(product))
      .filter((link): link is AffiliateLink => link !== null);
  }
}
