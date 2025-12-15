import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { auth, db } from '../../firebaseConfig';

export default function TabLayout() {
  // Mặc định là null để chưa hiện gì cả khi đang load
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setRole(userDoc.data().role || 'user');
          }
        } catch (e) {
          console.log("Lỗi check role:", e);
        }
      }
      setLoading(false);
    };
    checkRole();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="small" color="#2196F3" />
      </View>
    );
  }

  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#2196F3' }}>



      {/* =========================================================
          NHÓM 2: USER (Khách tìm nhà vệ sinh)
         ========================================================= */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Bản đồ',
          // Chỉ User thấy Map đầu tiên, hoặc Admin muốn soi map thì để Admin thấy luôn
          href: (role === 'user' || role === 'admin') ? undefined : null, 
          tabBarIcon: ({ color }) => <Ionicons name="map" size={24} color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Danh sách',
          href: role === 'user' ? '/(tabs)/explore' : null,
          tabBarIcon: ({ color }) => <Ionicons name="list" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="chatbot"
        options={{
          title: 'Trợ lý AI',
          href: role === 'user' ? '/(tabs)/chatbot' : null,
          tabBarIcon: ({ color }) => <Ionicons name="chatbubble-ellipses" size={24} color={color} />,
        }}
      />

      {/* =========================================================
          NHÓM 3: PROVIDER (Chủ nhà tắm)
         ========================================================= */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Tổng quan',
          href: role === 'provider' ? '/(tabs)/dashboard' : null,
          tabBarIcon: ({ color }) => <Ionicons name="pie-chart" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Đặt chỗ',
          href: role === 'provider' ? '/(tabs)/bookings' : null,
          tabBarIcon: ({ color }) => <Ionicons name="calendar" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Thêm mới',
          href: role === 'provider' ? '/(tabs)/profile' : null,
          tabBarIcon: ({ color }) => <Ionicons name="add-circle" size={32} color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="finance"
        options={{
          title: 'Tài chính',
          href: role === 'provider' ? '/(tabs)/finance' : null,
          tabBarIcon: ({ color }) => <Ionicons name="cash" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Vận hành',
          href: role === 'provider' ? '/(tabs)/inventory' : null,
          tabBarIcon: ({ color }) => <Ionicons name="construct" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="incidents"
        options={{
          title: 'Phản hồi',
          // Admin cũng cần xem phản hồi để xử lý tranh chấp
          href: (role === 'provider' || role === 'admin') ? '/(tabs)/incidents' : null,
          tabBarIcon: ({ color }) => <Ionicons name="chatbubbles" size={24} color={color} />,
        }}
      />
            {/* =========================================================
          NHÓM 1: COMMON (Ai cũng thấy, hoặc ít nhất là Account)
         ========================================================= */}
      <Tabs.Screen
        name="account"
        options={{
          title: 'Tài Khoản',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
        }}
      />

      {/* =========================================================
          NHÓM 4: ADMIN (Quản trị viên)
          (Tạm thời dùng chung map với user, nhưng sau này có thể tách trang quản lý riêng)
         ========================================================= */}
      
      {/* Ví dụ: Nếu Bình có trang quản lý user riêng cho admin */}
      {/* <Tabs.Screen
        name="admin-users"
        options={{
          title: 'QL User',
          href: role === 'admin' ? '/(tabs)/admin-users' : null,
          tabBarIcon: ({ color }) => <Ionicons name="people" size={24} color={color} />,
        }}
      /> */}

    </Tabs>
  );
}