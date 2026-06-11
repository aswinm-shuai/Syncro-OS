/**
 * Check if the user has the required role.
 * @param {Object} userDoc - The user document from Firestore.
 * @param {string} requiredRole - The required role (e.g., 'admin', 'staff').
 * @returns {boolean}
 */
export const hasPermission = (userDoc, requiredRole) => {
  if (!userDoc || !userDoc.role) return false;
  return userDoc.role === requiredRole;
};
