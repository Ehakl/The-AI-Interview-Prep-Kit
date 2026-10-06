const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

/**
 * WebCrawler.js
 * 
 * Dynamically scans the landing page, ranks links (looks for /careers, /jobs, /about, blog),
 * fetches content safely without crashing on broken URLs.
 */
class WebCrawler {
  constructor(timeoutMs = 5000) {
    this.timeoutMs = timeoutMs;
  }

  // Safe fetch that returns null on failure instead of throwing
  async fetchPage(url) {
    try {
      // Security: Prevent loopback/private IP ranges
      const parsed = new URL(url);
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname.startsWith('10.') || parsed.hostname.startsWith('192.168.')) {
         // The prompt says "The company sites used with this command may be served from a local address, so your retrieval code must not assume a particular host and must follow relative links. This command must run from a clean clone."
         // WAIT: "The company sites used with this command may be served from a local address". 
         // So for the batch command we MUST allow localhost! 
         // Let's just allow it here but in production we'd block it.
      }

      const response = await axios.get(url, { timeout: this.timeoutMs });
      return response.data;
    } catch (error) {
      console.warn(`[WebCrawler] Failed to fetch ${url}: ${error.message}`);
      return null;
    }
  }

  extractTextFromHtml(html) {
    if (!html) return '';
    const $ = cheerio.load(html);
    
    // Remove noise
    $('script, style, nav, footer, header, noscript, iframe').remove();
    
    // Extract remaining text
    let text = $('body').text();
    
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();
    return text.substring(0, 15000); // Limit tokens
  }

  async discoverImportantLinks(baseUrl, html) {
    const $ = cheerio.load(html);
    const links = [];
    
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      
      try {
        const resolvedUrl = new URL(href, baseUrl).href;
        // Prioritize links that seem related to hiring, culture, or about
        const lowerHref = href.toLowerCase();
        let score = 0;
        if (lowerHref.includes('career') || lowerHref.includes('job') || lowerHref.includes('hiring')) score += 10;
        if (lowerHref.includes('about') || lowerHref.includes('team')) score += 5;
        if (lowerHref.includes('blog') || lowerHref.includes('engineering')) score += 3;
        
        if (score > 0) {
          links.push({ url: resolvedUrl, score });
        }
      } catch (e) {
        // invalid URL format, ignore
      }
    });

    // Sort by score descending, keep top 3 unique links
    const uniqueLinks = new Map();
    links.sort((a, b) => b.score - a.score).forEach(l => {
      if (!uniqueLinks.has(l.url)) {
        uniqueLinks.set(l.url, l);
      }
    });

    return Array.from(uniqueLinks.values()).slice(0, 3).map(l => l.url);
  }

  async crawlCompany(companyUrl) {
    const results = {
      pages_used: [],
      content: ''
    };

    if (!companyUrl) return results;

    try {
      const mainHtml = await this.fetchPage(companyUrl);
      if (mainHtml) {
        results.pages_used.push(companyUrl);
        results.content += this.extractTextFromHtml(mainHtml) + "\n\n";

        const importantLinks = await this.discoverImportantLinks(companyUrl, mainHtml);
        
        // Fetch up to 3 high-value child pages
        for (const link of importantLinks) {
          if (results.pages_used.includes(link)) continue;
          
          const childHtml = await this.fetchPage(link);
          if (childHtml) {
            results.pages_used.push(link);
            results.content += `--- Source: ${link} ---\n`;
            results.content += this.extractTextFromHtml(childHtml) + "\n\n";
          }
        }
      }
    } catch (e) {
      console.error(`[WebCrawler] Crawl failed for ${companyUrl}:`, e);
    }

    return results;
  }
}

module.exports = WebCrawler;
