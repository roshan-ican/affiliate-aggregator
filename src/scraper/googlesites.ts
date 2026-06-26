import axios from 'axios';
import * as cheerio from 'cheerio';
import { Product } from '../types';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export interface GoogleSitesConfig {
  siteUrl: string;
}

export class GoogleSitesScraper {
  private siteUrl: string;

  constructor(config: GoogleSitesConfig) {
    this.siteUrl = config.siteUrl.replace(/\/$/, '');
  }

  async scrapeProducts(page: string = 'home'): Promise<Product[]> {
    const url = page === 'home' ? this.siteUrl : `${this.siteUrl}/${page}`;
    return this.fetchAndParse(url);
  }

  private async fetchAndParse(url: string): Promise<Product[]> {
    try {
      console.log(`[GoogleSites] Fetching: ${url}`);
      const response = await axios.get(url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-IN,en;q=0.9',
        },
        timeout: 15000,
      });

      const html = response.data as string;
      const amznLinks = this.extractAmznLinks(html);
      console.log(`[GoogleSites] Found ${amznLinks.length} amzn.to links`);

      if (amznLinks.length === 0) return [];

      const products = await this.resolveLinks(amznLinks);
      console.log(`[GoogleSites] Resolved ${products.length} products`);
      return products;
    } catch (error) {
      console.error('[GoogleSites] Error:', error);
      return [];
    }
  }

  private extractAmznLinks(html: string): string[] {
    const $ = cheerio.load(html);
    const seen = new Set<string>();

    $('a[href*="google.com/url"]').each((_i, el) => {
      const href = $(el).attr('href');
      if (!href) return;

      const qMatch = href.match(/[?&]q=([^&]+)/);
      if (!qMatch) return;

      const decoded = decodeURIComponent(qMatch[1]);
      if (decoded.includes('amzn.to') && !seen.has(decoded)) {
        seen.add(decoded);
      }
    });

    return Array.from(seen);
  }

  private async resolveLinks(amznLinks: string[]): Promise<Product[]> {
    const products: Product[] = [];

    for (const link of amznLinks) {
      try {
        const product = await this.resolveAmznLink(link);
        if (product) {
          products.push(product);
        }
      } catch (e) {
        console.warn(`[GoogleSites] Failed to resolve: ${link}`);
      }
    }

    return products;
  }

  private async resolveAmznLink(amznUrl: string): Promise<Product | null> {
    const resolved = await this.followRedirect(amznUrl);
    if (!resolved) return null;

    const asin = this.extractASIN(resolved);
    if (!asin) return null;

    const title = await this.scrapeProductTitle(resolved);
    const cleanUrl = `https://www.amazon.in/dp/${asin}`;

    return {
      title: title || asin,
      asin,
      imageUrl: '',
      price: 0,
      url: cleanUrl,
      source: 'amazon',
      extractedAt: new Date(),
    };
  }

  private async followRedirect(url: string): Promise<string | null> {
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': USER_AGENT },
        maxRedirects: 5,
        timeout: 10000,
        validateStatus: (status) => status < 400,
      });

      return response.request?.res?.responseUrl || url;
    } catch (error: any) {
      if (error.response?.status === 301 || error.response?.status === 302) {
        return error.response.headers.location || null;
      }
      return null;
    }
  }

  private extractASIN(url: string): string | null {
    const match = url.match(/\/dp\/([A-Z0-9]{10})/);
    return match ? match[1] : null;
  }

  private async scrapeProductTitle(amazonUrl: string): Promise<string | null> {
    try {
      const response = await axios.get(amazonUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept-Language': 'en-IN,en;q=0.9',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const title = $('#productTitle').text().trim();
      return title || null;
    } catch {
      return null;
    }
  }
}
