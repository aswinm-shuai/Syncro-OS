/**
 * Cloudinary Upload Helper
 * This does not rely on Firebase Storage, but provides a wrapper for Cloudinary.
 */

/**
 * Open Cloudinary Upload Widget
 * @param {Object} config - Cloudinary config containing cloudName and uploadPreset.
 * @param {Function} onSuccess - Callback when upload is successful, receives the secure URL.
 * @param {Function} [onError] - Callback when an error occurs.
 */
export const openUploadWidget = (config, onSuccess, onError) => {
  if (!window.cloudinary) {
    console.error("Cloudinary script not loaded.");
    return;
  }
  
  window.cloudinary.openUploadWidget({
    cloudName: config.cloudName,
    uploadPreset: config.uploadPreset,
    multiple: false,
    maxFiles: 1,
    clientAllowedFormats: ["png", "jpeg", "jpg", "webp"]
  }, (error, result) => {
    if (!error && result && result.event === "success") {
      onSuccess(result.info.secure_url);
    } else if (error && onError) {
      onError(error);
    }
  });
};
