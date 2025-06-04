// src/uploadToCloudinary.js
import axios from 'axios';

const CLOUD_NAME = 'dh1whb4lt';
const UPLOAD_PRESET = 'chatroom_unsigned'; // 你在 Cloudinary 控制台建立的 unsigned upload preset

export default async function uploadToCloudinary(file) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  try {
    const response = await axios.post(url, formData);
    return response.data.secure_url; // 回傳圖片網址
  } catch (error) {
    console.error('Cloudinary 上傳失敗', error);
    throw error;
  }
}
