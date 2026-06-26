import { Groq } from 'groq-sdk';
import { Product } from '../types';

export interface GroqConfig {
  apiKey: string;
  model?: string;
}

export class GroqProductParser {
  private client: Groq;
  private model: string;

  constructor(config: GroqConfig) {
    this.client = new Groq({ apiKey: config.apiKey });
    this.model = config.model || 'llama-3.1-8b-instant';
  }

  async parseHTML(html: string, platform: 'amazon' | 'flipkart'): Promise<Product[]> {
    try {
      const prompt = this.buildPrompt(html, platform);

      const completion = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        console.warn('[Groq] No content in response');
        return [];
      }

      const jsonText = this.extractJsonArray(content);
      if (!jsonText) {
        console.warn('[Groq] No valid JSON array found in response');
        return [];
      }

      const products = JSON.parse(jsonText) as Product[];
      return products.map(p => ({
        ...p,
        source: platform,
        extractedAt: new Date(),
      }));
    } catch (error) {
      console.error('[Groq] Error parsing HTML:', error);
      return [];
    }
  }

  private extractJsonArray(text: string): string | null {
    text = text.replace(/```json\s*|```/g, '').trim();

    const start = text.indexOf('[');
    if (start === -1) return null;

    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = start; i < text.length; i++) {
      const ch = text[i];

      if (escape) {
        escape = false;
        continue;
      }

      if (ch === '\\') {
        escape = true;
        continue;
      }

      if (ch === '"' && !escape) {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (ch === '[') depth++;
      else if (ch === ']') {
        depth--;
        if (depth === 0) {
          return text.substring(start, i + 1);
        }
      }
    }

    return null;
  }

  private buildPrompt(html: string, platform: 'amazon' | 'flipkart'): string {
    const platformName = platform === 'amazon' ? 'Amazon India' : 'Flipkart';

    return `You are a JSON API. Your ONLY job is to output a JSON array. Do not write code, explanations, or anything except the JSON array.

Extract product deal information from this ${platformName} HTML.

HTML:
${html.substring(0, 5000)}

Respond with a JSON array of products. Each product must have these fields:
- "title": product name (string)
- "price": price as a number (no currency symbol, remove commas)
- "imageUrl": image URL if found, or empty string ""
- "url": product URL if found, or empty string ""
- "discount": discount percentage as number if found, or null
- "rating": star rating as number if found, or null
- "asin": Amazon ASIN if applicable, or null
- "flipkartId": Flipkart ID if applicable, or null

Only include products with a visible price. Skip navigation, headers, and ads.
If no products found, output: []`;
  }
}
