import { AmazonLinkGenerator } from '../amazon';
import { Product } from '../../types';

describe('AmazonLinkGenerator', () => {
  const generator = new AmazonLinkGenerator({
    affiliateId: 'testid-21',
    domain: 'amazon.in',
  });

  const createProduct = (overrides: Partial<Product> = {}): Product => ({
    title: 'Test Product',
    imageUrl: 'https://example.com/image.jpg',
    price: 50000,
    url: 'https://www.amazon.in/dp/B0CXY123456',
    source: 'amazon',
    extractedAt: new Date(),
    ...overrides,
  });

  describe('generateAffiliateUrl', () => {
    test('should extract ASIN from clean URL', () => {
      const product = createProduct({
        asin: 'B0CXY12345',
        url: 'https://www.amazon.in/dp/B0CXY12345',
      });

      const link = generator.generateAffiliateUrl(product);
      expect(link).not.toBeNull();
      expect(link?.affiliateUrl).toBe(
        'https://www.amazon.in/dp/B0CXY12345?tag=testid-21'
      );
      expect(link?.product.asin).toBe('B0CXY12345');
      expect(link?.platform).toBe('amazon');
      expect(link?.affiliateId).toBe('testid-21');
    });

    test('should extract ASIN from URL with query params', () => {
      const product = createProduct({
        url: 'https://www.amazon.in/Some-Laptop-Title/dp/B0CXY12345?ref=abc&pf_rd_xyz=123',
      });

      const link = generator.generateAffiliateUrl(product);
      expect(link?.affiliateUrl).toBe(
        'https://www.amazon.in/dp/B0CXY12345?tag=testid-21'
      );
      expect(link?.product.asin).toBe('B0CXY12345');
    });

    test('should extract ASIN from URL with nested path', () => {
      const product = createProduct({
        url: 'https://www.amazon.in/Apple-iPhone-15-Black-128GB/dp/B0CHX3QBCH?ref=sr_1_1',
      });

      const link = generator.generateAffiliateUrl(product);
      expect(link?.affiliateUrl).toBe(
        'https://www.amazon.in/dp/B0CHX3QBCH?tag=testid-21'
      );
    });

    test('should return null for search page URL without ASIN', () => {
      const product = createProduct({
        url: 'https://www.amazon.in/s?k=laptop',
      });

      const link = generator.generateAffiliateUrl(product);
      expect(link).toBeNull();
    });

    test('should return null for homepage URL', () => {
      const product = createProduct({
        url: 'https://www.amazon.in',
      });

      const link = generator.generateAffiliateUrl(product);
      expect(link).toBeNull();
    });

    test('should use product ASIN if provided over URL extraction', () => {
      const product = createProduct({
        asin: 'B0PREDEFI',
        url: 'https://www.amazon.in/dp/B0CXY12345',
      });

      const link = generator.generateAffiliateUrl(product);
      expect(link?.product.asin).toBe('B0PREDEFI');
      expect(link?.affiliateUrl).toContain('B0PREDEFI');
    });

    test('should clean URL by removing tracking params', () => {
      const product = createProduct({
        url: 'https://www.amazon.in/dp/B0CXY12345?ref=sr_1_1&pf_rd_p=abc&linkCode=xyz',
      });

      const link = generator.generateAffiliateUrl(product);
      expect(link?.product.url).toBe('https://www.amazon.in/dp/B0CXY12345');
    });
  });

  describe('generateAffiliateUrlsBatch', () => {
    test('should process multiple valid products', () => {
      const products = [
        createProduct({ title: 'Product 1', url: 'https://www.amazon.in/dp/B0CXY12345' }),
        createProduct({ title: 'Product 2', url: 'https://www.amazon.in/dp/B0CXY76543' }),
      ];

      const links = generator.generateAffiliateUrlsBatch(products);
      expect(links).toHaveLength(2);
      expect(links[0].product.title).toBe('Product 1');
      expect(links[1].product.title).toBe('Product 2');
    });

    test('should filter out products without ASIN', () => {
      const products = [
        createProduct({ title: 'Valid Product', url: 'https://www.amazon.in/dp/B0CXY12345' }),
        createProduct({ title: 'Invalid Product', url: 'https://www.amazon.in/s?k=laptop' }),
      ];

      const links = generator.generateAffiliateUrlsBatch(products);
      expect(links).toHaveLength(1);
      expect(links[0].product.title).toBe('Valid Product');
    });

    test('should return empty array for no valid products', () => {
      const products = [
        createProduct({ url: 'https://www.amazon.in/s?k=laptop' }),
        createProduct({ url: 'https://www.amazon.in' }),
      ];

      const links = generator.generateAffiliateUrlsBatch(products);
      expect(links).toHaveLength(0);
    });
  });
});
