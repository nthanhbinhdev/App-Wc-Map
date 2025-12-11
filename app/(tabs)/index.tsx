import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { auth, db } from '../../firebaseConfig';
// 👉 SỬA ĐƯỜNG DẪN IMPORT Ở ĐÂY:
import ProviderDashboard from '../../components/ui/ProviderDashboard';
import UserMap from '../../components/ui/UserMap';

export default function HomeScreen() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setRole(userData.role || 'user');
        } else {
          setRole('user');
        }
      }
      setLoading(false);
    };
    checkRole();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={{marginTop: 10, color: '#666'}}>Đang phân loại công dân...</Text>
      </View>
    );
  }

  if (role === 'provider') {
    return <ProviderDashboard />;
  } else {
    return <UserMap />;
  }
}