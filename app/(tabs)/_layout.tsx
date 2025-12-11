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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="small" color="#2196F3" />
      </View>
    );
  }

  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#2196F3' }}>

      {/*Nhóm dành cho USER */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Bản đồ',
          // 👉 Sửa lại chỗ này: Trỏ về chính nó (undefined) nếu là User, còn Provider thì ẩn (null)
          // href: undefined nghĩa là "cứ hiện bình thường"
          href: role === 'user' ? undefined : null,
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
          title: 'Trợ lý',
          href: role === 'user' ? '/(tabs)/chatbot' : null,
          tabBarIcon: ({ color }) => <Ionicons name="chatbubble-ellipses" size={24} color={color} />,
        }}
      />

      {/*Nhóm danh cho provider*/}

      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Tổng quan',
          // Nếu là Provider thì mới hiện
          href: role === 'provider' ? '/(tabs)/dashboard' : null,
          tabBarIcon: ({ color }) => <Ionicons name="pie-chart" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Add',
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
          href: role === 'provider' ? '/(tabs)/incidents' : null,
          tabBarIcon: ({ color }) => <Ionicons name="chatbubbles" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="account"
        options={{
          title: 'Tài Khoản',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
        }}
      />


    </Tabs>

  );
}