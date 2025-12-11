import React from 'react';
import UserMap from '../../components/ui/UserMap';

export default function HomeScreen() {
  // Không cần check role nữa, ai vào đây cũng thấy Map hết
  return <UserMap />;
}