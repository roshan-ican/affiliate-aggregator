import { AmazonLinkGenerator } from './amazon';
import { FlipkartLinkGenerator } from './flipkart';
import { Product, AffiliateLink } from '../types';

export interface LinkGeneratorConfig {
  amazon: {
    affiliateId: string;
    domain: string;
  };
  flipkart: {
    affiliateId: string;
  };
}

export class LinkGenerator {
  private amazon: AmazonLinkGenerator;
  private flipkart: FlipkartLinkGenerator;

  constructor(config: LinkGeneratorConfig) {
    this.amazon = new AmazonLinkGenerator(config.amazon);
    this.flipkart = new FlipkartLinkGenerator(config.flipkart);
  }

  generate(product: Product): AffiliateLink | null {
    if (product.source === 'amazon') {
      return this.amazon.generateAffiliateUrl(product);
    } else if (product.source === 'flipkart') {
      return this.flipkart.generateAffiliateUrl(product);
    }
    return null;
  }

  generateBatch(products: Product[]): AffiliateLink[] {
    const amazonProducts = products.filter(p => p.source === 'amazon');
    const flipkartProducts = products.filter(p => p.source === 'flipkart');

    const amazonLinks = this.amazon.generateAffiliateUrlsBatch(amazonProducts);
    const flipkartLinks = this.flipkart.generateAffiliateUrlsBatch(flipkartProducts);

    return [...amazonLinks, ...flipkartLinks];
  }
}

export { AmazonLinkGenerator, FlipkartLinkGenerator };
