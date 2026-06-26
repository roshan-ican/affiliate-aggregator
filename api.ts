import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import cron from 'node-cron';
import { DealExtractor } from './src/extractor';
import { AmazonDealScraper } from './src/scraper';
import { GoogleSitesScraper } from './src/scraper/googlesites';
import { LinkGenerator } from './src/link-generator';
import { AffiliateLink } from './src/types';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASSWORD || '',
  },
});

function buildEmailHtml(links: AffiliateLink[], date: string): string {
  const products = links.map((l, i) => {
    const p = l.product;
    const img = p.imageUrl || '';
    const discountBadge = p.discount
      ? `<span style="background:#16a34a;color:#fff;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:600">-${p.discount}%</span>`
      : '';
    return `
    <tr>
      <td style="padding:16px;border-bottom:1px solid #e5e7eb">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td width="60" style="vertical-align:top;color:#9ca3af;font-size:22px;font-weight:700;padding-right:12px">${i + 1}</td>
            ${img ? `<td width="100" style="vertical-align:top;padding-right:16px"><img src="${img}" alt="" width="90" style="border-radius:8px;max-height:90px;object-fit:contain" /></td>` : ''}
            <td style="vertical-align:top">
              <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#111827;line-height:1.4">${p.title}</p>
              <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#059669">₹${p.price.toLocaleString('en-IN')} ${discountBadge}</p>
              <a href="${l.affiliateUrl}" style="display:inline-block;padding:8px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600">BUY NOW →</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;background:#fff">
  <tr>
    <td style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:30px 24px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:24px">⚡ Today's Smart Tech Deals</h1>
      <p style="margin:8px 0 0;color:#bfdbfe;font-size:14px">${date} — Best Amazon India deals handpicked for you</p>
    </td>
  </tr>
  ${products}
  <tr>
    <td style="padding:30px 24px;text-align:center;background:#f9fafb">
      <p style="margin:0 0 8px;color:#6b7280;font-size:12px">As an Amazon Associate we earn from qualifying purchases.</p>
      <p style="margin:0;color:#9ca3af;font-size:11px">© ${new Date().getFullYear()} Smart Tech Deals</p>
    </td>
  </tr>
</table>
</body>
</html>`;
}

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));

const linkGenerator = new LinkGenerator({
  amazon: {
    affiliateId: process.env.AMAZON_AFFILIATE_ID!,
    domain: process.env.AMAZON_DOMAIN || 'amazon.in',
  },
  flipkart: {
    affiliateId: process.env.FLIPKART_AFFILIATE_ID || 'dummy',
  },
});

const scraper = new AmazonDealScraper({
  domain: process.env.AMAZON_DOMAIN || 'amazon.in',
});

const googleSitesScraper = new GoogleSitesScraper({
  siteUrl: 'https://sites.google.com/view/smart-tech-deal',
});

const extractor = new DealExtractor({
  groq: {
    apiKey: process.env.GROQ_API_KEY!,
  },
  linkGenerator: {
    amazon: {
      affiliateId: process.env.AMAZON_AFFILIATE_ID!,
      domain: process.env.AMAZON_DOMAIN || 'amazon.in',
    },
    flipkart: {
      affiliateId: process.env.FLIPKART_AFFILIATE_ID || 'dummy',
    },
  },
});

/**
 * GET /api/offers/amazon
 * Scrapes Amazon deals page and returns affiliate links
 * Query params: ?category=electronics, ?query=gaming+laptop
 */
app.get('/api/offers/amazon', async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    const query = req.query.query as string | undefined;

    let products;
    if (query) {
      products = await scraper.scrapeSearch(query);
    } else if (category) {
      products = await scraper.scrapeCategory(category);
    } else {
      products = await scraper.scrapeTechDeals();
    }

    console.log(`[API] Scraped ${products.length} products`);

    const affiliateLinks = linkGenerator.generateBatch(
      products.filter(p => p.source === 'amazon')
    );

    res.json({
      success: true,
      scraped: products.length,
      affiliateLinks: affiliateLinks.length,
      data: affiliateLinks,
    });
  } catch (error) {
    console.error('[API] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/offers/smarttech
 * Scrapes the Google Sites Smart Tech Deals page and returns affiliate links
 */
app.get('/api/offers/smarttech', async (_req: Request, res: Response) => {
  try {
    const products = await googleSitesScraper.scrapeProducts();

    const affiliateLinks = linkGenerator.generateBatch(
      products.filter(p => p.source === 'amazon')
    );

    res.json({
      success: true,
      scraped: products.length,
      affiliateLinks: affiliateLinks.length,
      data: affiliateLinks,
    });
  } catch (error) {
    console.error('[API] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/extract
 * Body: { html: string, platform: 'amazon' | 'flipkart' }
 * Uses Groq LLM to parse HTML and generate affiliate links
 */
app.post('/api/extract', async (req: Request, res: Response) => {
  try {
    const { html, platform } = req.body;

    if (!html || !platform) {
      return res.status(400).json({
        error: 'Missing html or platform',
      });
    }

    const links = await extractor.extractAndTag(html, platform);

    res.json({
      success: true,
      count: links.length,
      data: links,
    });
  } catch (error) {
    console.error('[API] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/email/deals
 * Scrapes top tech deals and sends email via Gmail
 * Query: ?count=5 (default 10), ?preview=true (just show HTML)
 */
app.get('/api/email/deals', async (req: Request, res: Response) => {
  try {
    const count = parseInt(req.query.count as string) || 10;
    const previewOnly = req.query.preview === 'true';

    const products = await scraper.scrapeTechDeals();

    if (products.length === 0) {
      return res.status(500).json({ success: false, error: 'No products found' });
    }

    const affiliateLinks = linkGenerator.generateBatch(products);
    const top = affiliateLinks.slice(0, count);

    const now = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const emailHtml = buildEmailHtml(top, now);
    const recipient = process.env.EMAIL_RECIPIENT || 'btechfinds@gmail.com';

    if (previewOnly) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(emailHtml);
    }

    const info = await transporter.sendMail({
      from: `"Smart Tech Deals" <${process.env.EMAIL_USER}>`,
      to: recipient,
      subject: `⚡ Today's Top ${count} Tech Deals — ${now}`,
      html: emailHtml,
    });

    res.json({
      success: true,
      sent: true,
      to: recipient,
      messageId: info.messageId,
      deals: top.length,
    });
  } catch (error) {
    console.error('[API] Email error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Health check
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cronSchedule: process.env.CRON_SCHEDULE || '0 8 * * *',
  });
});

/**
 * Send the daily deals email (reusable function)
 */
async function sendDealsEmail(count: number = 10): Promise<void> {
  console.log('[Cron] Starting daily deals email...');

  const products = await scraper.scrapeTechDeals();
  if (products.length === 0) {
    console.warn('[Cron] No products scraped, skipping email');
    return;
  }

  const affiliateLinks = linkGenerator.generateBatch(products);
  const top = affiliateLinks.slice(0, count);

  const now = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const emailHtml = buildEmailHtml(top, now);
  const recipient = process.env.EMAIL_RECIPIENT || 'btechfinds@gmail.com';

  const info = await transporter.sendMail({
    from: `"Smart Tech Deals" <${process.env.EMAIL_USER}>`,
    to: recipient,
    subject: `⚡ Today's Top ${count} Tech Deals — ${now}`,
    html: emailHtml,
  });

  console.log(`[Cron] Email sent to ${recipient} | ${top.length} deals | ID: ${info.messageId}`);
}

// Schedule daily email (default: 8 AM IST)
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 8 * * *';
cron.schedule(CRON_SCHEDULE, () => {
  sendDealsEmail(10).catch(err => console.error('[Cron] Failed:', err.message));
}, {
  timezone: process.env.TIMEZONE || 'Asia/Kolkata',
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[API] Server running on http://localhost:${PORT}`);
  console.log(`[API] GET  http://localhost:${PORT}/api/offers/amazon`);
  console.log(`[API] GET  http://localhost:${PORT}/api/offers/smarttech`);
  console.log(`[API] GET  http://localhost:${PORT}/api/email/deals`);
  console.log(`[API] POST http://localhost:${PORT}/api/extract`);
  console.log(`[API] Cron scheduled: "${CRON_SCHEDULE}" (${process.env.TIMEZONE || 'Asia/Kolkata'})`);
});
