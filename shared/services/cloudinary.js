// Cloudinary API Service

// Replace with your Cloudinary cloud name and upload preset
const CLOUD_NAME = 'YOUR_CLOUD_NAME'; 
const UPLOAD_PRESET = 'YOUR_UPLOAD_PRESET'; // Make sure this is an "unsigned" preset

/**
 * Upload an image to Cloudinary
 * @param {File} file - The image file object from input[type="file"]
 * @param {Function} onProgress - Callback for upload progress
 * @returns {Promise<string>} - Returns the secure_url of the uploaded image
 */
export const uploadImageToCloudinary = async (file, onProgress) => {
  if (CLOUD_NAME === 'YOUR_CLOUD_NAME') {
    console.warn("[Mock Cloudinary] Simulating upload since credentials are missing.");
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 20;
        if (onProgress) onProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          // Return a local blob URL for mock purposes
          resolve(URL.createObjectURL(file));
        }
      }, 300);
    });
  }

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const percentComplete = Math.round((e.loaded / e.total) * 100);
        onProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        // We can apply transformation here, e.g., auto optimization
        // Cloudinary provides secure_url, but we can insert transformations
        let finalUrl = response.secure_url;
        // Example: insert "q_auto,f_auto" after "upload/"
        finalUrl = finalUrl.replace('/upload/', '/upload/q_auto,f_auto,w_800,c_limit/');
        resolve(finalUrl);
      } else {
        reject(JSON.parse(xhr.responseText));
      }
    };

    xhr.onerror = () => reject(new Error("Network error occurred during upload."));
    xhr.send(formData);
  });
};
