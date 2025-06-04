import axios from 'axios';

const CLOUD_NAME = 'dh1whb4lt';
const UPLOAD_PRESET = 'chatroom_unsigned';

export default async function uploadToCloudinary(file) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  try {
    const response = await axios.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.secure_url; // 回傳可公開訪問的圖片網址
  } catch (error) {
    console.error('Cloudinary upload error:', error.response || error.message);
    throw error;
  }
}
