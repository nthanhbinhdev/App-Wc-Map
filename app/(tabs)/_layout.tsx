import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { auth, db } from '../../firebaseConfig';

export default function TabLayout() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Kiểm tra quyền khi load Tab
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
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="small" color="#2196F3"/>
      </View>
    );
  }

  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#2196F3' }}>
      
      {/* 1. Tab Trang Chủ (Map hoặc Dashboard - Tùy role do file index.tsx quyết định) */}
      <Tabs.Screen
        name="index"
        options={{
          title: role === 'provider' ? 'Quản lý' : 'Map', // Đổi tên luôn cho xịn
          tabBarIcon: ({ color }) => <Ionicons name={role === 'provider' ? "stats-chart" : "map"} size={24} color={color} />,
        }}
      />

      {/* 2. Tab Danh Sách */}
      <Tabs.Screen
        name="explore"
        options={{
          title: 'List',
          tabBarIcon: ({ color }) => <Ionicons name="list" size={24} color={color} />,
        }}
      />

      {/* 3. Tab Thêm Mới (CHỈ HIỆN VỚI PROVIDER) */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Add',
          // 👉 PHÉP THUẬT Ở ĐÂY: Nếu không phải provider thì href = null (Ẩn luôn)
          href: role === 'provider' ? '/(tabs)/profile' : null,
          tabBarIcon: ({ color }) => <Ionicons name="add-circle" size={32} color={color} />,
        }}
      />

      {/* 4. Tab Tài Khoản */}
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
        }}
      />

    </Tabs>
  );
}