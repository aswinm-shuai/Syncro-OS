/**
 * Validate required fields in an object.
 * @param {Object} data 
 * @param {Array<string>} requiredFields 
 * @returns {boolean} True if valid, false otherwise.
 */
export const validateRequired = (data, requiredFields) => {
  if (!data) return false;
  return requiredFields.every(field => {
    return data[field] !== undefined && data[field] !== null && data[field] !== '';
  });
};
