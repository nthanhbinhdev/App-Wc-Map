import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// 👉 SỬA ĐƯỜNG DẪN IMPORT Ở ĐÂY:
import { auth, db } from '../../firebaseConfig'; // Lùi 2 cấp

export default function ProviderDashboard() {
  const user = auth.currentUser;
  const [myToilets, setMyToilets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalViews: 0, totalIncome: 0 });

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    
    // 👉 Chỉ lấy WC do chính Provider này tạo
    const q = query(collection(db, "toilets"), where("createdBy", "==", user.email));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      let income = 0;
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({ id: doc.id, ...data });
        // Giả sử mỗi WC có trường totalIncome, tạm thời random cho vui mắt
        income += (data.price || 5000) * (data.ratingCount || 1); 
      });
      
      setMyToilets(list);
      setStats({ totalViews: list.length, totalIncome: income });
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const renderMyWC = ({ item }: { item: any }) => (
    <View style={styles.wcCard}>
      <View style={styles.wcIcon}>
        <Ionicons name="business" size={24} color="#FF9800" />
      </View>
      <View style={{flex: 1}}>
        <Text style={styles.wcName}>{item.name}</Text>
        <Text style={styles.wcAddress}>{item.address}</Text>
        <View style={styles.statusRow}>
            <View style={[styles.statusBadge, {backgroundColor: item.status === 'approved' ? '#E8F5E9' : '#FFF3E0'}]}>
                <Text style={{fontSize: 10, color: item.status === 'approved' ? 'green' : 'orange', fontWeight: 'bold'}}>
                    {item.status === 'approved' ? 'ĐANG HOẠT ĐỘNG' : 'CHỜ DUYỆT'}
                </Text>
            </View>
            <Text style={styles.ratingText}>⭐ {item.rating || 5.0}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.editBtn}>
        <Ionicons name="create-outline" size={20} color="#666" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* HEADER DASHBOARD */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Xin chào, Chủ tịch 👋</Text>
        <Text style={styles.email}>{user?.email}</Text>
        
        <View style={styles.statsContainer}>
            <View style={styles.statBox}>
                <Text style={styles.statNumber}>{stats.totalViews}</Text>
                <Text style={styles.statLabel}>Địa điểm</Text>
            </View>
            <View style={styles.line} />
            <View style={styles.statBox}>
                <Text style={styles.statNumber}>{stats.totalIncome.toLocaleString()}đ</Text>
                <Text style={styles.statLabel}>Doanh thu (Ước tính)</Text>
            </View>
        </View>
      </View>

      {/* DANH SÁCH WC CỦA TÔI */}
      <View style={styles.body}>
        <Text style={styles.sectionTitle}>Cơ sở vật chất của tôi 🏢</Text>
        {loading ? (
            <ActivityIndicator size="large" color="#FF9800" />
        ) : (
            <FlatList
                data={myToilets}
                renderItem={renderMyWC}
                keyExtractor={item => item.id}
                ListEmptyComponent={<Text style={styles.empty}>Bạn chưa có địa điểm nào.</Text>}
                contentContainerStyle={{paddingBottom: 20}}
            />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: '#2196F3', padding: 20, paddingTop: 60, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  greeting: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  email: { fontSize: 14, color: '#E3F2FD', marginBottom: 20 },
  statsContainer: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 15, padding: 15, elevation: 5 },
  statBox: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 12, color: '#666' },
  line: { width: 1, backgroundColor: '#EEE' },
  
  body: { flex: 1, padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  wcCard: { flexDirection: 'row', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, alignItems: 'center', elevation: 2 },
  wcIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  wcName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  wcAddress: { fontSize: 12, color: '#666', marginBottom: 5 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  ratingText: { fontSize: 12, fontWeight: 'bold', color: '#F57C00' },
  editBtn: { padding: 10 },
  empty: { textAlign: 'center', color: '#999', marginTop: 30 }
});