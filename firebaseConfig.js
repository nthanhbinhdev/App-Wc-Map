// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 👉 Thay toàn bộ đoạn bên dưới bằng thông tin ông vừa lấy được trên web
// Import the functions you need from the SDKs you need
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDTFRQMnb13QbstClkG1AbpkW_s0Qk4lqM",
  authDomain: "wc-map-3fd84.firebaseapp.com",
  projectId: "wc-map-3fd84",
  storageBucket: "wc-map-3fd84.firebasestorage.app",
  messagingSenderId: "818318512600",
  appId: "1:818318512600:web:169c726850116ea4ada2ad"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app); // Để đăng nhập
const db = getFirestore(app); // Để lưu dữ liệu

// Xuất ra để các màn hình khác dùng
export { auth, db };

