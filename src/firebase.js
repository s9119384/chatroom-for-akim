// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBU-psFHhAXD1wepxxZySmQkZl2Ce_8EuE",
  authDomain: "chatroom-for-akim.firebaseapp.com",
  projectId: "chatroom-for-akim",
  storageBucket: "chatroom-for-akim.appspot.com",
  messagingSenderId: "245413847904",
  appId: "1:245413847904:web:32d36b6b232dfe6a74b405",
  measurementId: "G-NKWEFVPLS5"
};

// 初始化 Firebase 應用程式
const app = initializeApp(firebaseConfig);

// 初始化 Firestore 並導出
export const db = getFirestore(app);
