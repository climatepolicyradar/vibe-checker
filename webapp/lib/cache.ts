import NodeCache from 'node-cache';

// Create a cache instance with 15-minute TTL (900 seconds)
// Check for expired keys every 2 minutes (120 seconds)
const cache = new NodeCache({
  stdTTL: 900, // 15 minutes
  checkperiod: 120 // 2 minutes
});

export default cache;
