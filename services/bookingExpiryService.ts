import { Stack, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { auth } from '../firebaseConfig';
// 👉 Import Booking Expiry Service
import { startBookingExpiryService, stopBookingExpiryService } from '../services/bookingExpiryService';

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const segments = useSegments();

  // 1. Lắng nghe trạng thái đăng nhập từ Firebase
  useEffect(() => {
    console.log("Checking auth state...");
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
  }, []); 

  // 👉 2. Khởi động Background Service khi user đăng nhập
  useEffect(() => {
    if (user) {
      startBookingExpiryService();
    } else {
      stopBookingExpiryService();
    }
    
    // Cleanup khi unmount
    return () => {
      stopBookingExpiryService();
    };
  }, [user]);

  // 3. Điều hướng dựa trên trạng thái User
  useEffect(() => {
    if (initializing) return;

    const inAuthGroup = segments[0] === '(tabs)'; // Kiểm tra xem user có đang ở trong màn hình chính không

    if (user && !inAuthGroup) {
      // ✅ Đã đăng nhập nhưng đang ở Login -> Đá vào trang chủ
      router.replace('/(tabs)');
    } else if (!user && inAuthGroup) {
      // ❌ Chưa đăng nhập mà đòi vào trang chủ -> Đá ra Login
      router.replace('/login');
    }
  }, [user, initializing, segments]);