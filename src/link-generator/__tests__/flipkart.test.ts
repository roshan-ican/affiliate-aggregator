import { FlipkartLinkGenerator } from '../flipkart';
import { Product } from '../../types';

describe('FlipkartLinkGenerator', () => {
  const generator = new FlipkartLinkGenerator({
    affiliateId: 'flipkart_id_123',
  });

  const createProduct = (overrides: Partial<Product> = {}): Product => ({
    title: 'Test Product',
    imageUrl: 'https://example.com/image.jpg',
    price: 30000,
    url: 'https://www.flipkart.com/apple-iphone-15/p/ITMA1234567890',
    source: 'flipkart',
    extractedAt: new Date(),
    ...overrides,
  });

  describe('generateAffiliateUrl', () => {
    test('should extract product ID and build affiliate URL', () => {
      const product = createProduct({
        url: 'https://www.flipkart.com/apple-iphone-15/p/ITMA1234567890',
      });

      const link = generator.generateAffiliateUrl(product);
      expect(link).not.toBeNull();
      expect(link?.affiliateUrl).toBe(
        'https://www.flipkart.com/apple-iphone-15/p/ITMA1234567890?affid=flipkart_id_123'
      );
      expect(link?.product.flipkartId).toBe('ITMA1234567890');
      expect(link?.platform).toBe('flipkart');
      expect(link?.affiliateId).toBe('flipkart_id_123');
    });

    test('should extract product ID from URL with query params', () => {
      const product = createProduct({
        url: 'https://www.flipkart.com/apple-iphone-15/p/ITMA1234567890?param=value',
      });

      const link = generator.generateAffiliateUrl(product);
      expect(link?.affiliateUrl).toBe(
        'https://www.flipkart.com/apple-iphone-15/p/ITMA1234567890?affid=flipkart_id_123'
      );
      expect(link?.product.flipkartId).toBe('ITMA1234567890');
    });

    test('should handle URL with multiple query params', () => {
      const product = createProduct({
        url: 'https://www.flipkart.com/some-product/p/ITMABC123?otracker=search&marketplace=FLIPKART',
      });

      const link = generator.generateAffiliateUrl(product);
      expect(link?.affiliateUrl).toBe(
        'https://www.flipkart.com/some-product/p/ITMABC123?affid=flipkart_id_123'
      );
    });

    test('should return null for URL without product ID', () => {
      const product = createProduct({
        url: 'https://www.flipkart.com/search?q=laptop',
      });

      const link = generator.generateAffiliateUrl(product);
      expect(link).toBeNull();
    });

    test('should return null for homepage URL', () => {
      const product = createProduct({
        url: 'https://www.flipkart.com',
      });

      const link = generator.generateAffiliateUrl(product);
      expect(link).toBeNull();
    });

    test('should return null for invalid URL', () => {
      const product = createProduct({
        url: 'not-a-valid-url',
      });

      const link = generator.generateAffiliateUrl(product);
      expect(link).toBeNull();
    });

    test('should clean URL by removing existing query params', () => {
      const product = createProduct({
        url: 'https://www.flipkart.com/product/p/ITMA123?old_param=value',
      });

      const link = generator.generateAffiliateUrl(product);
      expect(link?.product.url).toBe('https://www.flipkart.com/product/p/ITMA123');
    });
  });

  describe('generateAffiliateUrlsBatch', () => {
    test('should process multiple valid products', () => {
      const products = [
        createProduct({ title: 'Product 1', url: 'https://www.flipkart.com/p1/p/ITMA111' }),
        createProduct({ title: 'Product 2', url: 'https://www.flipkart.com/p2/p/ITMA222' }),
      ];

      const links = generator.generateAffiliateUrlsBatch(products);
      expect(links).toHaveLength(2);
      expect(links[0].product.title).toBe('Product 1');
      expect(links[1].product.title).toBe('Product 2');
    });

    test('should filter out products without valid ID', () => {
      const products = [
        createProduct({ title: 'Valid', url: 'https://www.flipkart.com/p1/p/ITMA111' }),
        createProduct({ title: 'Invalid', url: 'https://www.flipkart.com/search?q=laptop' }),
      ];

      const links = generator.generateAffiliateUrlsBatch(products);
      expect(links).toHaveLength(1);
      expect(links[0].product.title).toBe('Valid');
    });

    test('should return empty array for no valid products', () => {
      const products = [
        createProduct({ url: 'https://www.flipkart.com/search?q=laptop' }),
      ];

      const links = generator.generateAffiliateUrlsBatch(products);
      expect(links).toHaveLength(0);
    });
  });
});
