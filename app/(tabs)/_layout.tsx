import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#2196F3' }}>
      
      {/* 1. Tab Bản Đồ */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <Ionicons name="map" size={24} color={color} />,
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

      {/* 3. Tab Thêm Mới (Đổi tên hiển thị từ Profile -> Add cho đúng nghĩa) */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Add',
          tabBarIcon: ({ color }) => <Ionicons name="add-circle" size={32} color={color} />,
        }}
      />

      {/* 4. Tab Tài Khoản (MỚI) */}
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