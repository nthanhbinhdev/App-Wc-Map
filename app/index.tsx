import { Redirect } from 'expo-router';

export default function Index() {
  // Mở App lên -> Mặc định cứ thử vào trang chủ
  // (Nếu chưa đăng nhập, file _layout.tsx ở trên sẽ chặn lại và đá về login)
  return <Redirect href="/(tabs)" />;
}