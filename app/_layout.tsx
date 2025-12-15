import { Stack, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { auth } from '../firebaseConfig';

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

  // 2. Điều hướng dựa trên trạng thái User
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

  // 3. Màn hình chờ lúc đang kiểm tra (Loading...)
  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  // 4. Khai báo các màn hình
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}