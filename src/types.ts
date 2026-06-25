export interface Product {
  title: string;
  asin?: string;
  flipkartId?: string;
  imageUrl: string;
  price: number;
  discount?: number;
  rating?: number;
  url: string;
  source: 'amazon' | 'flipkart';
  extractedAt: Date;
}

export interface AffiliateLink {
  product: Product;
  affiliateUrl: string;
  affiliateId: string;
  platform: 'amazon' | 'flipkart';
  cleanedAt: Date;
}

export interface DealEmail {
  products: AffiliateLink[];
  generatedAt: Date;
  totalCount: number;
}
