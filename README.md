# Affiliate Deal Aggregator

Automatically scrape deals from Amazon India and Flipkart, convert them to affiliate links, and get a daily email digest.

**Status:** Phase 1 complete (Link Generator)

---

## What This Project Does

1. Scrapes deal pages from Amazon India and Flipkart
2. Extracts product details (title, price, rating, discount)
3. Converts product URLs to your affiliate links
4. Sends you a clean HTML email with all the deals

You run it on a schedule (e.g., 8 AM daily), and wake up to a curated deal email in your inbox.

---

## Prerequisites

Before you start, make sure you have:

- [ ] **Node.js 20+** installed — [Download here](https://nodejs.org/)
- [ ] **npm** (comes with Node.js)
- [ ] **Git** installed — [Download here](https://git-scm.com/)
- [ ] **Firecrawl API key** — [Sign up free](https://firecrawl.dev/) (600 credits/month)
- [ ] **SendGrid API key** — [Sign up free](https://sendgrid.com/) (100 emails/day)
- [ ] **Amazon Associates account** — [Join here](https://affiliate-program.amazon.in/)
- [ ] **Flipkart Affiliate account** — [Join here](https://affiliate.flipkart.com/)

---

## Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/<your-username>/affiliate-aggregator.git
cd affiliate-aggregator
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up your API keys

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Then edit `.env` with your actual keys:

```env
# Firecrawl (for scraping)
FIRECRAWL_API_KEY=your_firecrawl_api_key

# Amazon Affiliate
AMAZON_AFFILIATE_ID=yourname0a-21
AMAZON_DOMAIN=amazon.in

# Flipkart Affiliate
FLIPKART_AFFILIATE_ID=your_flipkart_id

# Email (SendGrid)
SENDGRID_API_KEY=your_sendgrid_key
SENDGRID_FROM_EMAIL=deals@yourdomain.com
SENDGRID_FROM_NAME=Daily Deals
EMAIL_RECIPIENT=your-email@gmail.com

# Schedule
CRON_SCHEDULE=0 8 * * *
TIMEZONE=Asia/Kolkata
```

### 4. Run tests

```bash
npm test
```

You should see:

```
PASS  src/link-generator/__tests__/amazon.test.ts
PASS  src/link-generator/__tests__/flipkart.test.ts

Tests: 20 passed, 20 total
```

### 5. Build the project

```bash
npm run build
```

---

## Project Structure

```
affiliate-aggregator/
├── src/
│   ├── types.ts                    # Shared data types (Product, AffiliateLink)
│   └── link-generator/
│       ├── amazon.ts               # Amazon ASIN → affiliate URL
│       ├── flipkart.ts             # Flipkart ID → affiliate URL
│       ├── index.ts                # Unified interface (routes by platform)
│       └── __tests__/
│           ├── amazon.test.ts      # Amazon link generator tests
│           └── flipkart.test.ts    # Flipkart link generator tests
├── .env.example                    # Template for API keys
├── .gitignore                      # Files to ignore in git
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
├── jest.config.js                  # Test configuration
└── README.md                       # This file
```

---

## How Each File Works

### `src/types.ts`
Defines the data shapes everything else uses:
- **Product** — a scraped product (title, price, ASIN/ID, URL, etc.)
- **AffiliateLink** — a product with your affiliate URL attached
- **DealEmail** — collection of affiliate links ready to email

### `src/link-generator/amazon.ts`
- Extracts ASIN from Amazon URLs (the 10-character code like `B0CHX3QBCH`)
- Strips tracking parameters from URLs
- Builds affiliate URL: `https://www.amazon.in/dp/B0CHX3QBCH?tag=yourname0a-21`

### `src/link-generator/flipkart.ts`
- Extracts product ID from Flipkart URLs (like `ITMA1234567890`)
- Strips query parameters
- Builds affiliate URL: `https://www.flipkart.com/product/p/ITMA1234567890?affid=your_id`

### `src/link-generator/index.ts`
- Unified `LinkGenerator` class
- Routes to Amazon or Flipkart based on `product.source`
- Batch processes mixed product lists

---

## Available Scripts

| Command | What It Does |
|---------|--------------|
| `npm test` | Run all unit tests |
| `npm run test:watch` | Run tests in watch mode (re-runs on file changes) |
| `npm run build` | Compile TypeScript to JavaScript in `dist/` |
| `npm start` | Run the compiled app (after build) |

---

## How the Affiliate Links Work

### Amazon
1. Product URL: `https://www.amazon.in/Some-Product/dp/B0CHX3QBCH?ref=abc`
2. Your affiliate URL: `https://www.amazon.in/dp/B0CHX3QBCH?tag=yourname0a-21`
3. When someone clicks and buys, you earn a commission

### Flipkart
1. Product URL: `https://www.flipkart.com/product/p/ITMA1234567890?param=value`
2. Your affiliate URL: `https://www.flipkart.com/product/p/ITMA1234567890?affid=your_id`
3. When someone clicks and buys, you earn a commission

---

## Troubleshooting

### "Cannot find name 'describe'" error
Run: `npm install` to install test dependencies.

### Tests fail with ASIN errors
Amazon ASINs are exactly 10 characters. If you see mismatched ASINs, check your test data.

### Build fails
Run `npm run build` and check the error message. Usually it's a missing import or type error.

### `.env` not loading
Make sure `.env` is in the project root (same level as `package.json`).

---

## What's Next (Phase 2)

- [ ] Firecrawl integration (scrape deal pages)
- [ ] HTML parser (extract products from page source)
- [ ] Deduplication (remove duplicate products)
- [ ] Email template (HTML email generation)
- [ ] SendGrid integration (send emails)
- [ ] Cron scheduler (run daily at 8 AM)

---

## License

ISC
