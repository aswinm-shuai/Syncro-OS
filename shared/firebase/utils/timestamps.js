/**
 * Generate a standard ISO Date string.
 * @returns {string}
 */
export const getCurrentISODate = () => {
  return new Date().toISOString();
};

/**
 * Format an ISO Date for display.
 * @param {string} isoString 
 * @returns {string} 
 */
export const formatDisplayDate = (isoString) => {
  if (!isoString) return '';
  return new Date(isoString).toLocaleString('id-ID');
};
