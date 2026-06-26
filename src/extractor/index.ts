import { GroqProductParser } from './groq-parser';
import { LinkGenerator, LinkGeneratorConfig } from '../link-generator';
import { Product, AffiliateLink } from '../types';

export interface ExtractorConfig {
  groq: {
    apiKey: string;
  };
  linkGenerator: LinkGeneratorConfig;
}

export class DealExtractor {
  private groqParser: GroqProductParser;
  private linkGenerator: LinkGenerator;

  constructor(config: ExtractorConfig) {
    this.groqParser = new GroqProductParser({ apiKey: config.groq.apiKey });
    this.linkGenerator = new LinkGenerator(config.linkGenerator);
  }

  /**
   * Full pipeline: HTML → parse → affiliate links
   */
  async extractAndTag(
    html: string,
    platform: 'amazon' | 'flipkart'
  ): Promise<AffiliateLink[]> {
    console.log(`[Extractor] Starting ${platform} extraction...`);

    // Step 1: Parse HTML with Groq
    const products = await this.groqParser.parseHTML(html, platform);
    console.log(`[Extractor] Groq extracted ${products.length} products`);

    if (products.length === 0) {
      console.warn('[Extractor] No products extracted');
      return [];
    }

    // Step 2: Generate affiliate links
    const affiliateLinks = this.linkGenerator.generateBatch(products);
    console.log(`[Extractor] Generated ${affiliateLinks.length} affiliate links`);

    return affiliateLinks;
  }
}

export { GroqProductParser };