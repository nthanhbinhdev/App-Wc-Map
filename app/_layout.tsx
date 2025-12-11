// import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
// import { Stack } from 'expo-router';
// import { StatusBar } from 'expo-status-bar';
// import 'react-native-reanimated';

// import { useColorScheme } from '@/hooks/use-color-scheme';

// export const unstable_settings = {
//   anchor: '(tabs)',
// };

// export default function RootLayout() {
//   const colorScheme = useColorScheme();

//   return (
//     <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
//       <Stack>
//         <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
//         <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
//       </Stack>
//       <StatusBar style="auto" />
//     </ThemeProvider>
//   );
// }

import { Stack, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { auth } from '../firebaseConfig'; // Check lại đường dẫn này nha

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const segments = useSegments();

  // 1. Lắng nghe trạng thái đăng nhập từ Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
  }, );

  // 2. Điều hướng dựa trên trạng thái User
  useEffect(() => {
    if (initializing) return;

    const inAuthGroup = segments[0] === '(tabs)'; // Kiểm tra xem user có đang ở trong app không

    if (user && !inAuthGroup) {
      // Đã đăng nhập nhưng đang ở trang Login -> Đá vào trong
      router.replace('/(tabs)');
    } else if (!user && inAuthGroup) {
      // Chưa đăng nhập mà đòi vào trong -> Đá ra Login
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

  // 4. Cấu trúc Navigation
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Trang Login (Không hiện header) */}
      <Stack.Screen name="login" options={{ headerShown: false }} />
      
      {/* Cụm trang chính (Tabs) */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
