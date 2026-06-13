import { dbService } from "../services/db.js";

/**
 * Log an audit action to Firestore
 * @param {Object} params
 * @param {string} params.action - 'CREATE', 'EDIT', 'DELETE'
 * @param {string} params.module - 'Orders', 'Transactions', 'Products', 'Purchases', 'Expenses', 'Ingredients', 'Recipes'
 * @param {Object} [params.previousData] - State of data before action (optional for CREATE)
 * @param {Object} [params.newData] - State of data after action (optional for DELETE)
 * @param {Object} currentUser - Current logged in user object { name, role }
 */
export const logAudit = async ({ action, module, previousData = null, newData = null }, currentUser) => {
  try {
    // Attempt to get IP Address (public API)
    let ipAddress = 'Unknown';
    try {
      const ipRes = await fetch('https://api.ipify.org?format=json');
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        ipAddress = ipData.ip;
      }
    } catch (e) {
      console.warn("Could not fetch IP Address for audit log.");
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      userName: currentUser?.name || 'System',
      userRole: currentUser?.role || 'System',
      actionType: action,
      module: module,
      previousData: previousData ? JSON.stringify(previousData) : null,
      newData: newData ? JSON.stringify(newData) : null,
      ipAddress: ipAddress
    };

    await dbService.addDocument('audit_logs', logEntry);
    console.log(`[Audit] Logged ${action} on ${module}`);
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
};
