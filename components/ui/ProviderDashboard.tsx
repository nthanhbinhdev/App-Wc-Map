// import { Ionicons } from '@expo/vector-icons';
// import { collection, onSnapshot, query, where } from 'firebase/firestore';
// import React, { useEffect, useState } from 'react';
// import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// // 👉 SỬA ĐƯỜNG DẪN IMPORT Ở ĐÂY:
// import { auth, db } from '../../firebaseConfig'; // Lùi 2 cấp

// export default function ProviderDashboard() {
//   const user = auth.currentUser;
//   const [myToilets, setMyToilets] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [stats, setStats] = useState({ totalViews: 0, totalIncome: 0 });

//   useEffect(() => {
//     if (!user) return;
//     setLoading(true);

//     // 👉 Chỉ lấy WC do chính Provider này tạo
//     const q = query(collection(db, "toilets"), where("createdBy", "==", user.email));

//     const unsubscribe = onSnapshot(q, (snapshot) => {
//       const list: any[] = [];
//       let income = 0;

//       snapshot.forEach((doc) => {
//         const data = doc.data();
//         list.push({ id: doc.id, ...data });
//         // Giả sử mỗi WC có trường totalIncome, tạm thời random cho vui mắt
//         income += (data.price || 5000) * (data.ratingCount || 1); 
//       });

//       setMyToilets(list);
//       setStats({ totalViews: list.length, totalIncome: income });
//       setLoading(false);
//     });

//     return () => unsubscribe();
//   }, []);

//   const renderMyWC = ({ item }: { item: any }) => (
//     <View style={styles.wcCard}>
//       <View style={styles.wcIcon}>
//         <Ionicons name="business" size={24} color="#FF9800" />
//       </View>
//       <View style={{flex: 1}}>
//         <Text style={styles.wcName}>{item.name}</Text>
//         <Text style={styles.wcAddress}>{item.address}</Text>
//         <View style={styles.statusRow}>
//             <View style={[styles.statusBadge, {backgroundColor: item.status === 'approved' ? '#E8F5E9' : '#FFF3E0'}]}>
//                 <Text style={{fontSize: 10, color: item.status === 'approved' ? 'green' : 'orange', fontWeight: 'bold'}}>
//                     {item.status === 'approved' ? 'ĐANG HOẠT ĐỘNG' : 'CHỜ DUYỆT'}
//                 </Text>
//             </View>
//             <Text style={styles.ratingText}>⭐ {item.rating || 5.0}</Text>
//         </View>
//       </View>
//       <TouchableOpacity style={styles.editBtn}>
//         <Ionicons name="create-outline" size={20} color="#666" />
//       </TouchableOpacity>
//     </View>
//   );

//   return (
//     <View style={styles.container}>
//       {/* HEADER DASHBOARD */}
//       <View style={styles.header}>
//         <Text style={styles.greeting}>Xin chào, Chủ tịch 👋</Text>
//         <Text style={styles.email}>{user?.email}</Text>

//         <View style={styles.statsContainer}>
//             <View style={styles.statBox}>
//                 <Text style={styles.statNumber}>{stats.totalViews}</Text>
//                 <Text style={styles.statLabel}>Địa điểm</Text>
//             </View>
//             <View style={styles.line} />
//             <View style={styles.statBox}>
//                 <Text style={styles.statNumber}>{stats.totalIncome.toLocaleString()}đ</Text>
//                 <Text style={styles.statLabel}>Doanh thu (Ước tính)</Text>
//             </View>
//         </View>
//       </View>

//       {/* DANH SÁCH WC CỦA TÔI */}
//       <View style={styles.body}>
//         <Text style={styles.sectionTitle}>Cơ sở vật chất của tôi 🏢</Text>
//         {loading ? (
//             <ActivityIndicator size="large" color="#FF9800" />
//         ) : (
//             <FlatList
//                 data={myToilets}
//                 renderItem={renderMyWC}
//                 keyExtractor={item => item.id}
//                 ListEmptyComponent={<Text style={styles.empty}>Bạn chưa có địa điểm nào.</Text>}
//                 contentContainerStyle={{paddingBottom: 20}}
//             />
//         )}
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#F5F5F5' },
//   header: { backgroundColor: '#2196F3', padding: 20, paddingTop: 60, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
//   greeting: { fontSize: 22, fontWeight: 'bold', color: 'white' },
//   email: { fontSize: 14, color: '#E3F2FD', marginBottom: 20 },
//   statsContainer: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 15, padding: 15, elevation: 5 },
//   statBox: { flex: 1, alignItems: 'center' },
//   statNumber: { fontSize: 18, fontWeight: 'bold', color: '#333' },
//   statLabel: { fontSize: 12, color: '#666' },
//   line: { width: 1, backgroundColor: '#EEE' },

//   body: { flex: 1, padding: 20 },
//   sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
//   wcCard: { flexDirection: 'row', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, alignItems: 'center', elevation: 2 },
//   wcIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
//   wcName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
//   wcAddress: { fontSize: 12, color: '#666', marginBottom: 5 },
//   statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
//   statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
//   ratingText: { fontSize: 12, fontWeight: 'bold', color: '#F57C00' },
//   editBtn: { padding: 10 },
//   empty: { textAlign: 'center', color: '#999', marginTop: 30 }
// });

// app/(tabs)/provider-dashboard.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, deleteDoc, doc, getDoc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../../firebaseConfig';

export default function ProviderDashboard() {
  const router = useRouter();
  const user = auth.currentUser;

  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [myToilets, setMyToilets] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, totalRevenue: 0 });

  // Modal edit
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingToilet, setEditingToilet] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editAddress, setEditAddress] = useState('');

  // 1. Kiểm tra role
  useEffect(() => {
    const checkRole = async () => {
      if (!user) return;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const role = userDoc.data()?.role || 'user';
      setUserRole(role);

      if (role !== 'provider') {
        Alert.alert('Không có quyền', 'Chỉ nhà cung cấp mới truy cập được!');
        router.back();
      }
    };
    checkRole();
  }, []);

  // 2. Load danh sách WC của mình
  useEffect(() => {
    if (!user || userRole !== 'provider') return;

    const q = query(collection(db, 'toilets'), where('createdBy', '==', user.email));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      let approved = 0, pending = 0, revenue = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({ id: doc.id, ...data });

        if (data.status === 'approved') approved++;
        else pending++;

        // Giả sử mỗi WC có field checkInCount (số lượt check-in)
        revenue += (data.price || 0) * (data.checkInCount || 0);
      });

      setMyToilets(list);
      setStats({ total: list.length, approved, pending, totalRevenue: revenue });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userRole]);

  // 3. Hàm sửa WC
  const handleEdit = (item: any) => {
    setEditingToilet(item);
    setEditName(item.name);
    setEditPrice(String(item.price));
    setEditAddress(item.address);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingToilet) return;
    try {
      await updateDoc(doc(db, 'toilets', editingToilet.id), {
        name: editName,
        price: Number(editPrice),
        address: editAddress,
      });
      Alert.alert('Thành công', 'Đã cập nhật!');
      setEditModalVisible(false);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message);
    }
  };

  // 4. Hàm xóa WC
  const handleDelete = (item: any) => {
    Alert.alert('Xác nhận xóa', `Xóa "${item.name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'toilets', item.id));
            Alert.alert('Đã xóa', 'Địa điểm đã được xóa');
          } catch (error: any) {
            Alert.alert('Lỗi', error.message);
          }
        }
      }
    ]);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={styles.cardAddress}>{item.address}</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: item.status === 'approved' ? '#E8F5E9' : '#FFF3E0' }]}>
            <Text style={[styles.statusText, { color: item.status === 'approved' ? '#4CAF50' : '#FF9800' }]}>
              {item.status === 'approved' ? '✓ Đã duyệt' : '⏳ Chờ duyệt'}
            </Text>
          </View>
          <Text style={styles.priceText}>{item.price === 0 ? 'Miễn phí' : `${Number(item.price).toLocaleString()}đ`}</Text>
        </View>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity onPress={() => handleEdit(item)} style={styles.editBtn}>
          <Ionicons name="pencil" size={18} color="#2196F3" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
          <Ionicons name="trash" size={18} color="#F44336" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Provider Dashboard</Text>
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: '#E3F2FD' }]}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Tổng WC</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#E8F5E9' }]}>
            <Text style={styles.statNumber}>{stats.approved}</Text>
            <Text style={styles.statLabel}>Đã duyệt</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#FFF3E0' }]}>
            <Text style={styles.statNumber}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Chờ duyệt</Text>
          </View>
        </View>
        <View style={[styles.revenueBox, { backgroundColor: '#F3E5F5' }]}>
          <Text style={styles.revenueLabel}>Doanh thu ước tính</Text>
          <Text style={styles.revenueAmount}>{stats.totalRevenue.toLocaleString()}đ</Text>
        </View>
      </View>

      {/* List */}
      <View style={styles.listContainer}>
        <Text style={styles.sectionTitle}>WC của tôi ({myToilets.length})</Text>
        <FlatList
          data={myToilets}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.emptyText}>Chưa có WC nào. Hãy thêm mới ở tab Add!</Text>}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </View>

      {/* Edit Modal */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chỉnh sửa WC</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Tên WC"
            />
            <TextInput
              style={styles.input}
              value={editAddress}
              onChangeText={setEditAddress}
              placeholder="Địa chỉ"
            />
            <TextInput
              style={styles.input}
              value={editPrice}
              onChangeText={setEditPrice}
              placeholder="Giá (VNĐ)"
              keyboardType="numeric"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.cancelBtn}>
                <Text>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveEdit} style={styles.confirmBtn}>
                <Text style={{ color: 'white' }}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: 'white', padding: 20, paddingTop: 60, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  statBox: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 5 },
  revenueBox: { padding: 15, borderRadius: 12, alignItems: 'center' },
  revenueLabel: { fontSize: 12, color: '#666' },
  revenueAmount: { fontSize: 22, fontWeight: 'bold', color: '#7B1FA2', marginTop: 5 },

  listContainer: { flex: 1, padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  card: { flexDirection: 'row', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 2 },
  cardName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  cardAddress: { fontSize: 13, color: '#666', marginBottom: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  priceText: { fontSize: 13, fontWeight: 'bold', color: '#2196F3' },
  actionButtons: { flexDirection: 'row', gap: 10 },
  editBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center' },
  deleteBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 50 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 30 },
  modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 15 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 10 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  cancelBtn: { padding: 10 },
  confirmBtn: { backgroundColor: '#2196F3', padding: 10, borderRadius: 8, paddingHorizontal: 20 },
});