/**
 * Lightweight, high-performance in-memory Rate Limiter & Sanitizer
 * Protects public guest routes from spam, flooding, and abuse while allowing smooth hotel usage.
 */

const ipHits = new Map();

/**
 * Creates a rate limiter middleware
 * @param {Object} options
 * @param {number} options.windowMs - Window size in milliseconds
 * @param {number} options.max - Max allowed requests in window
 * @param {string} options.message - Error message returned on 429
 */
function createRateLimiter({ windowMs = 60000, max = 60, message = "Iltimos, bir necha soniya kuting." }) {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const branch = req.body?.branchId || req.params?.branchId || req.query?.branchId || '';
    const room = req.body?.roomNumber || req.params?.roomNumber || req.query?.roomNumber || '';
    const session = req.body?.sessionId || req.headers['x-session-id'] || req.query?.sessionId || '';
    
    // Key by route + room/session + IP so multiple rooms on the same hotel Wi-Fi don't share limits
    const key = `${req.baseUrl || req.path}_b${branch}_r${room}_s${session}_${ip}`;
    const now = Date.now();

    let record = ipHits.get(key);
    if (!record) {
      record = { count: 1, resetAt: now + windowMs };
      ipHits.set(key, record);
    } else {
      if (now > record.resetAt) {
        record.count = 1;
        record.resetAt = now + windowMs;
      } else {
        record.count += 1;
        if (record.count > max) {
          const retryAfter = Math.ceil((record.resetAt - now) / 1000);
          res.set('Retry-After', retryAfter);
          return res.status(429).json({
            success: false,
            error: message,
            message: message,
            retryAfterSeconds: retryAfter
          });
        }
      }
    }

    next();
  };
}

// Cleanup expired keys every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of ipHits.entries()) {
    if (now > record.resetAt + 60000) {
      ipHits.delete(key);
    }
  }
}, 300000);

/**
 * Sanitize text input: strips harmful script tags, HTML, and trims
 */
function sanitizeText(str, maxLength = 800) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>?/gm, '') // Strip HTML tags
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
    .slice(0, maxLength);
}

// Generous limits for active hotel rooms and testers
const guestPublicLimiter = createRateLimiter({ windowMs: 60000, max: 300, message: "Iltimos, biroz kuting." });
const guestRequestLimiter = createRateLimiter({ windowMs: 60000, max: 60, message: "Iltimos, bir necha soniya kuting." });
const guestChatLimiter = createRateLimiter({ windowMs: 60000, max: 100, message: "Iltimos, bir necha soniya kuting." });

module.exports = {
  createRateLimiter,
  sanitizeText,
  guestPublicLimiter,
  guestRequestLimiter,
  guestChatLimiter
};

