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
import QRCode from 'react-native-qrcode-svg'; // Đảm bảo đã cài: npm install react-native-qrcode-svg
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

  // Modal QR Code
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedQRToilet, setSelectedQRToilet] = useState<any>(null);

  // 1. Kiểm tra role
  useEffect(() => {
    const checkRole = async () => {
      if (!user) return;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const role = userDoc.data()?.role || 'user';
      setUserRole(role);

      // Nếu không phải provider (và không phải admin - tuỳ logic), đá về
      if (role !== 'provider') {
        // Alert.alert('Không có quyền', 'Chỉ nhà cung cấp mới truy cập được!');
        // router.back();
      }
    };
    checkRole();
  }, []);

  // 2. Load danh sách WC của mình
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'toilets'), where('createdBy', '==', user.email));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      let approved = 0, pending = 0, revenue = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({ id: doc.id, ...data });

        if (data.status === 'approved') approved++;
        else pending++;

        revenue += (data.price || 0) * (data.ratingCount || 0); // Mock doanh thu
      });

      setMyToilets(list);
      setStats({ total: list.length, approved, pending, totalRevenue: revenue });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

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

  // 5. Hàm hiển thị QR
  const handleShowQR = (item: any) => {
    setSelectedQRToilet(item);
    setQrModalVisible(true);
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
        {/* Nút xem QR Code */}
        <TouchableOpacity onPress={() => handleShowQR(item)} style={styles.qrBtn}>
          <Ionicons name="qr-code" size={18} color="white" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => handleEdit(item)} style={styles.editBtn}>
          <Ionicons name="pencil" size={18} color="#2196F3" />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
          <Ionicons name="trash" size={18} color="#F44336" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // 👉 Nút thêm mới khi danh sách rỗng
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
        <Ionicons name="storefront-outline" size={64} color="#ccc" />
        <Text style={styles.emptyText}>Chưa có địa điểm nào</Text>
        <Text style={styles.emptySubText}>
            Tạo ngay địa điểm đầu tiên để lấy mã QR và bắt đầu đón khách!
        </Text>
        <TouchableOpacity 
            style={styles.btnAddFirst}
            onPress={() => router.push('/(tabs)/profile')} // Chuyển sang Tab Thêm mới
        >
            <Ionicons name="add-circle" size={24} color="white" />
            <Text style={styles.btnAddFirstText}>Thêm địa điểm ngay</Text>
        </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Quản lý cơ sở</Text>
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: '#E3F2FD' }]}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Tổng số</Text>
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
        <Text style={styles.sectionTitle}>Danh sách địa điểm ({myToilets.length})</Text>
        <FlatList
          data={myToilets}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmptyState} // 👉 Sử dụng component empty state mới
          contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
        />
      </View>

      {/* Edit Modal */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chỉnh sửa thông tin</Text>
            <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Tên địa điểm" />
            <TextInput style={styles.input} value={editAddress} onChangeText={setEditAddress} placeholder="Địa chỉ" />
            <TextInput style={styles.input} value={editPrice} onChangeText={setEditPrice} placeholder="Giá vé (VNĐ)" keyboardType="numeric" />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.cancelBtn}><Text style={{color: '#666'}}>Hủy</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSaveEdit} style={styles.confirmBtn}><Text style={{ color: 'white', fontWeight: 'bold' }}>Lưu thay đổi</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* QR Code Modal - ĐỂ IN RA DÁN TƯỜNG */}
      <Modal visible={qrModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalContent}>
            <View style={styles.qrHeader}>
               <Text style={styles.modalTitle}>Mã QR Cửa Hàng</Text>
               <TouchableOpacity onPress={() => setQrModalVisible(false)}>
                 <Ionicons name="close" size={24} color="#333" />
               </TouchableOpacity>
            </View>
            
            <Text style={styles.qrSubtitle}>Dán mã này tại quầy để khách check-in</Text>
            
            {selectedQRToilet && (
              <View style={styles.qrWrapper}>
                <QRCode
                  value={`STORE_${selectedQRToilet.id}`} // 👉 Format chuẩn: STORE_ID
                  size={200}
                  logoBackgroundColor='transparent'
                />
              </View>
            )}
            
            <Text style={styles.storeName}>{selectedQRToilet?.name}</Text>
            <Text style={styles.storeId}>ID: STORE_{selectedQRToilet?.id}</Text>

            <TouchableOpacity style={styles.printBtn} onPress={() => Alert.alert("Thông báo", "Tính năng in đang phát triển! Hãy chụp màn hình nhé.")}>
                <Ionicons name="print" size={20} color="white" />
                <Text style={{color:'white', fontWeight:'bold', marginLeft: 8}}>In Mã QR</Text>
            </TouchableOpacity>
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
  statBox: { flex: 1, padding: 10, borderRadius: 12, alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 11, color: '#666', marginTop: 5 },
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
  
  actionButtons: { justifyContent: 'space-between', paddingLeft: 10, borderLeftWidth: 1, borderLeftColor: '#eee' },
  qrBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  editBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  deleteBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center' },
  
  // 👉 Style cho Empty State
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 50, padding: 20 },
  emptyText: { textAlign: 'center', color: '#333', fontSize: 18, fontWeight: 'bold', marginTop: 15 },
  emptySubText: { textAlign: 'center', color: '#666', fontSize: 14, marginTop: 5, marginBottom: 25, width: '80%' },
  btnAddFirst: { flexDirection: 'row', backgroundColor: '#2196F3', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, alignItems: 'center', elevation: 3 },
  btnAddFirstText: { color: 'white', fontWeight: 'bold', marginLeft: 8 },

  // Modal General
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20, alignItems: 'center' },
  modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 15, width: '100%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 10, marginTop: 10 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  cancelBtn: { padding: 10 },
  confirmBtn: { backgroundColor: '#2196F3', padding: 10, borderRadius: 8, paddingHorizontal: 20 },

  // QR Modal Specific
  qrModalContent: { backgroundColor: 'white', padding: 20, borderRadius: 20, width: 320, alignItems: 'center' },
  qrHeader: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 10 },
  qrSubtitle: { color: '#666', marginBottom: 20, textAlign: 'center' },
  qrWrapper: { padding: 15, backgroundColor: 'white', borderRadius: 10, elevation: 5, marginBottom: 15 },
  storeName: { fontSize: 18, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  storeId: { fontSize: 12, color: '#999', marginTop: 5, fontFamily: 'monospace' },
  printBtn: { flexDirection: 'row', backgroundColor: '#2196F3', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25, marginTop: 20, alignItems: 'center' }
});