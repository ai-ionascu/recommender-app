import axios from 'axios';

const VITE_CLOUDINARY_UPLOAD_URL = import.meta.env.VITE_CLOUDINARY_UPLOAD_URL;
const VITE_CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const prepareImagePayload = async (images) => {
  const result = [];

  if (!images || images.length === 0) {
    return result;
  }

  for (const img of images) {
    if (img.rawFile instanceof File) {
      // Upload local file to Cloudinary
      const formData = new FormData();
      formData.append('file', img.rawFile);
      formData.append('upload_preset', VITE_CLOUDINARY_UPLOAD_PRESET);

      try {
        const uploadRes = await axios.post(VITE_CLOUDINARY_UPLOAD_URL, formData);
        result.push({
          url: uploadRes.data.secure_url,
          alt_text: img.alt_text || '',
          is_main: img.is_main === true,
        });
      } catch (err) {
        console.error('Cloudinary upload error:', err);
        throw new Error('Failed to upload local image');
      }
    } else {
      // Upload external URL to Cloudinary via backend proxy
      try {
        const proxyRes = await axios.post(`${import.meta.env.VITE_API_URL}/products/images/upload`, {
          url: img.url,
        });

        result.push({
          url: proxyRes.data.secure_url,
          alt_text: img.alt_text || '',
          is_main: img.is_main === true,
        });
      } catch (err) {
        console.error('Cloudinary proxy upload error:', err);
        throw new Error('Failed to proxy-upload external image');
      }
    }
  }

  return result;
};
