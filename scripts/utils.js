/**
 * Utility functions for Edge Delivery Services
 */

/**
 * Detects if running in Universal Editor context
 * @returns {boolean} True if in Universal Editor or localhost
 */
export function isUniversalEditor() {
  return window.location.hostname.includes('.ue.da.live')
    || window.location.hostname === 'localhost';
}

/**
 * Fetch with automatic cache-busting in Universal Editor
 *
 * In UE context, uses cache: 'reload' to ensure authors always
 * see fresh content. In production, uses standard caching.
 *
 * @param {string|Request} resource - URL or Request object
 * @param {RequestInit} [options] - Fetch options
 * @returns {Promise<Response>} Fetch response
 *
 * @example
 * // Instead of: fetch(url)
 * // Use: fetchWithCacheBusting(url)
 * const response = await fetchWithCacheBusting('/fragments/header.plain.html');
 */
export async function fetchWithCacheBusting(resource, options = {}) {
  const fetchOptions = isUniversalEditor()
    ? { ...options, cache: 'reload' }
    : options;

  return fetch(resource, fetchOptions);
}
