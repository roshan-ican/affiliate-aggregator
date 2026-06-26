import axios from 'axios';
import * as cheerio from 'cheerio';
import { Product } from '../types';

const AMAZON_DOMAIN = 'https://www.amazon.in';
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
];

export interface ScraperConfig {
  domain?: string;
}

export class AmazonDealScraper {
  private domain: string;

  constructor(config: ScraperConfig = {}) {
    this.domain = config.domain || 'amazon.in';
  }

  async scrapeDealsPage(): Promise<Product[]> {
    const url = `${AMAZON_DOMAIN}/s?k=electronics+gadgets+deals`;
    return this.fetchAndParse(url);
  }

  async scrapeTechDeals(): Promise<Product[]> {
    const urls = [
      `${AMAZON_DOMAIN}/s?k=smartphones+deals`,
      `${AMAZON_DOMAIN}/s?k=laptops+deals`,
      `${AMAZON_DOMAIN}/s?k=earbuds+deals`,
      `${AMAZON_DOMAIN}/s?k=smartwatches+deals`,
    ];

    const allProducts: Product[] = [];
    const seen = new Set<string>();

    for (const url of urls) {
      const products = await this.fetchAndParse(url);
      for (const p of products) {
        if (p.url && !seen.has(p.url)) {
          seen.add(p.url);
          allProducts.push(p);
        }
      }
      await new Promise(r => setTimeout(r, 3000 + Math.random() * 2000));
    }

    return allProducts;
  }

  async scrapeCategory(category: string): Promise<Product[]> {
    const query = encodeURIComponent(`${category} deals`);
    const url = `${AMAZON_DOMAIN}/s?k=${query}`;
    return this.fetchAndParse(url);
  }

  async scrapeSearch(query: string): Promise<Product[]> {
    const url = `${AMAZON_DOMAIN}/s?k=${encodeURIComponent(query + ' deals')}`;
    return this.fetchAndParse(url);
  }

  private async fetchAndParse(url: string): Promise<Product[]> {
    try {
      console.log(`[Scraper] Fetching: ${url}`);
      const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
      const response = await axios.get(url, {
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-IN,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
        },
        timeout: 15000,
        decompress: true,
      });

      const html = response.data as string;
      console.log(`[Scraper] Got ${html.length} chars`);
      return this.parseProducts(html);
    } catch (error) {
      console.error('[Scraper] Fetch error:', error);
      return [];
    }
  }

  private parseProducts(html: string): Product[] {
    const $ = cheerio.load(html);
    const products: Product[] = [];
    const seenUrls = new Set<string>();

    const productCards = $(
      '[data-asin][data-component-type="s-search-result"], ' +
      '[data-asin][data-index], ' +
      '.s-result-item[data-asin]'
    );

    if (productCards.length > 0) {
      productCards.each((_i, el) => {
        const $el = $(el);

        if ($el.find('.s-sponsored-label-info-icon, [aria-label*="Sponsored"]').length > 0) return;

        const asin = $el.attr('data-asin');
        if (!asin || asin.length < 5 || asin.length > 15) return;

        const titleEl = $(el).find('h2 a, h2 span, .a-size-medium.a-text-normal, [data-cy="title-recipe"]');
        const title = titleEl.first().text().trim();

        if (!title || title.length < 5) return;

        const imageEl = $(el).find('img.s-image, .s-image');
        const imageUrl = imageEl.attr('src') || '';

        const linkEl = $(el).find('a.a-link-normal.s-line-clamp-2, a.a-link-normal.s-underline-text, h2 a');
        const linkPath = linkEl.attr('href') || `/dp/${asin}`;
        const productUrl = linkPath.startsWith('http')
          ? linkPath
          : `${AMAZON_DOMAIN}${linkPath}`;

        if (seenUrls.has(productUrl)) return;

        const priceWhole = $(el).find('.a-price-whole').first().text().replace(/,/g, '');
        const priceFraction = $(el).find('.a-price-fraction').first().text();
        const price = priceWhole ? parseFloat(priceWhole + (priceFraction || '')) : 0;

        const discountText = $(el).find('.a-letter-space + span, .savingsPercentage, [data-a-badge-color="sx-lightning-deal-red"] span').first().text();
        const discount = discountText ? this.parseDiscount(discountText) : undefined;

        const ratingText = $(el).find('.a-icon-alt, [aria-label*="out of 5 stars"]').first().text();
        const rating = ratingText ? this.parseRating(ratingText) : undefined;

        if (price > 0) {
          seenUrls.add(productUrl);
          products.push({
            title,
            asin,
            imageUrl,
            price,
            discount,
            rating,
            url: productUrl,
            source: 'amazon',
            extractedAt: new Date(),
          });
        }
      });

      if (products.length > 0) {
        console.log(`[Scraper] Extracted ${products.length} products from search results`);
        return products;
      }
    }

    if (products.length === 0) {
      const links = $('a[href*="/dp/"]');
      links.each((_i, el) => {
        const href = $(el).attr('href');
        if (!href) return;

        const asinMatch = href.match(/\/dp\/([A-Z0-9]{10})/);
        if (!asinMatch) return;

        const asin = asinMatch[1];
        if (seenUrls.has(asin)) return;

        const titleEl = $(el).find('.a-truncate-full, .a-truncate-cut, h2, span').first();
        let title = '';

        let parent = $(el).parent();
        for (let d = 0; d < 10; d++) {
          const card = $(parent).closest('[data-asin], .s-result-item, .a-section');
          if (card.length > 0) {
            const cardAsin = card.attr('data-asin');
            if (cardAsin && cardAsin !== asin) return;
            const h2 = card.find('h2, .a-size-medium');
            if (h2.length > 0) {
              title = h2.first().text().trim();
            }
            break;
          }
          parent = $(parent).parent();
        }

        if (!title) {
          title = titleEl.text().trim() || $(el).text().trim();
        }

        if (title.length < 5) return;

        const productUrl = href.startsWith('http') ? href : `${AMAZON_DOMAIN}${href}`;
        const cleanUrl = productUrl.split('?')[0].split('#')[0];

        if (seenUrls.has(cleanUrl)) return;
        seenUrls.add(asin);

        products.push({
          title: title.substring(0, 200),
          asin,
          imageUrl: '',
          price: 0,
          url: cleanUrl,
          source: 'amazon',
          extractedAt: new Date(),
        });
      });
    }

    return products;
  }

  private parseDiscount(text: string): number | undefined {
    const match = text.match(/(\d+)/);
    if (match) {
      const pct = parseInt(match[1], 10);
      if (pct > 0 && pct <= 100) return pct;
    }
    return undefined;
  }

  private parseRating(text: string): number | undefined {
    const match = text.match(/(\d+\.?\d*)/);
    if (match) {
      const rating = parseFloat(match[1]);
      if (rating > 0 && rating <= 5) return rating;
    }
    return undefined;
  }
}
