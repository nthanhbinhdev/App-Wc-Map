import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { updateProfile } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../firebaseConfig';
// 👉 Import hàm seed data
import { seedDatabase } from '../../utils/seedToilets';

export default function UserProfile() {
  const router = useRouter();
  const user = auth.currentUser;

  const [stats, setStats] = useState({ contributions: 0, reviews: 0 });
  const [dataList, setDataList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('contributions'); 
  const [seeding, setSeeding] = useState(false); // State loading cho nút seed

  // Modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || '');

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const qWC = query(collection(db, "toilets"), where("createdBy", "==", user.email));
      const snapWC = await getDocs(qWC);
      const wcCount = snapWC.size;

      const qRev = query(collection(db, "reviews"), where("userEmail", "==", user.email));
      const snapRev = await getDocs(qRev);
      const reviewCount = snapRev.size;

      setStats({ contributions: wcCount, reviews: reviewCount });

      const list: any[] = [];
      if (activeTab === 'contributions') {
        snapWC.forEach(doc => list.push({ id: doc.id, ...doc.data(), type: 'place' }));
      } else {
        snapRev.forEach(doc => list.push({ id: doc.id, ...doc.data(), type: 'review' }));
      }
      setDataList(list);

    } catch (error) { console.log(error); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [activeTab]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    try {
      await updateProfile(user, { displayName: newName });
      Alert.alert("Thành công", "Tên hiển thị đã được cập nhật!");
      setEditModalVisible(false);
    } catch (error: any) { Alert.alert("Lỗi", error.message); }
  };

  // 👉 HÀM GỌI SEED DATA
  const handleSeedData = async () => {
    Alert.alert(
      "Xác nhận",
      "Bạn có chắc muốn tạo 50 địa điểm giả không? Việc này sẽ ghi trực tiếp vào Database.",
      [
        { text: "Hủy", style: "cancel" },
        { 
          text: "Triển luôn!", 
          onPress: async () => {
            setSeeding(true);
            try {
              await seedDatabase();
              Alert.alert("Xong!", "Đã tạo 50 nhà tắm thành công. Qua bản đồ check ngay!");
            } catch (error: any) {
              Alert.alert("Lỗi", error.message);
            } finally {
              setSeeding(false);
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    if (activeTab === 'contributions') {
      return (
        <View style={styles.card}>
          <View style={styles.iconSquare}><Ionicons name="location" size={20} color="#1A73E8" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSub}>{item.address}</Text>
            <Text style={[styles.status, { color: item.status === 'approved' ? 'green' : 'orange' }]}>
              {item.status === 'approved' ? 'Đã công khai' : 'Đang chờ duyệt'}
            </Text>
          </View>
        </View>
      );
    } else {
      return (
        <View style={styles.card}>
          <View style={styles.iconSquare}><Ionicons name="star" size={20} color="#FBC02D" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Đánh giá của bạn</Text>
            <Text style={styles.cardSub}>"{item.comment}"</Text>
            <View style={{ flexDirection: 'row' }}>
              {[...Array(item.rating)].map((_, i) => <Ionicons key={i} name="star" size={10} color="#FBC02D" />)}
            </View>
          </View>
        </View>
      )
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileHeader}>
        <Image
          source={{ uri: user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}&background=random` }}
          style={styles.avatarLarge}
        />
        <Text style={styles.nameLarge}>{user?.displayName || "Người dùng"}</Text>
        <Text style={styles.levelLabel}>Local Guide • Cấp 1</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{stats.contributions}</Text>
            <Text style={styles.statLabel}>Đóng góp</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{stats.reviews}</Text>
            <Text style={styles.statLabel}>Đánh giá</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>0</Text>
            <Text style={styles.statLabel}>Người theo dõi</Text>
          </View>
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.outlineBtn} onPress={() => setEditModalVisible(true)}>
            <Text style={styles.btnText}>Chỉnh sửa hồ sơ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineBtn} onPress={() => auth.signOut().then(() => router.replace('/login'))}>
            <Ionicons name="log-out-outline" size={18} color="#333" />
          </TouchableOpacity>
        </View>

        {/* 👉 NÚT SEED DATA (CHỈ DÙNG ĐỂ TEST) */}
        <TouchableOpacity 
          style={[styles.seedBtn, seeding && {opacity: 0.5}]} 
          onPress={handleSeedData}
          disabled={seeding}
        >
          {seeding ? (
            <ActivityIndicator size="small" color="#D32F2F" />
          ) : (
            <Text style={styles.seedBtnText}>⚠️ TẠO 50 DATA MẪU</Text>
          )}
        </TouchableOpacity>

      </View>

      <View style={styles.tabs}>
        <TouchableOpacity onPress={() => setActiveTab('contributions')} style={[styles.tab, activeTab === 'contributions' && styles.activeTab]}>
          <Text style={[styles.tabText, activeTab === 'contributions' && styles.activeTabText]}>Đóng góp</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('reviews')} style={[styles.tab, activeTab === 'reviews' && styles.activeTab]}>
          <Text style={[styles.tabText, activeTab === 'reviews' && styles.activeTabText]}>Đánh giá</Text>
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator style={{ marginTop: 20 }} /> : (
        <FlatList
          data={dataList}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 30, color: '#999' }}>Chưa có hoạt động nào</Text>}
        />
      )}

      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cập nhật tên</Text>
            <TextInput style={styles.input} value={newName} onChangeText={setNewName} placeholder="Nhập tên mới..." />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.cancelBtn}><Text>Hủy</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleUpdateProfile} style={styles.confirmBtn}><Text style={{ color: 'white' }}>Lưu</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  profileHeader: { padding: 20, paddingTop: 50, alignItems: 'center' },
  avatarLarge: { width: 80, height: 80, borderRadius: 40, marginBottom: 10 },
  nameLarge: { fontSize: 22, fontWeight: 'bold', color: '#202124' },
  levelLabel: { color: '#EA8600', fontWeight: 'bold', fontSize: 12, marginTop: 2 },

  statsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', marginTop: 20, marginBottom: 20 },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 16, fontWeight: 'bold', color: '#202124' },
  statLabel: { fontSize: 12, color: '#5F6368' },

  btnRow: { flexDirection: 'row', gap: 10 },
  outlineBtn: { borderWidth: 1, borderColor: '#DADCE0', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center' },
  btnText: { fontWeight: '500', color: '#3C4043' },

  // Style cho nút Seed
  seedBtn: { marginTop: 15, borderWidth: 1, borderColor: '#FFCDD2', backgroundColor: '#FFEBEE', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  seedBtnText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 12 },

  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#1A73E8' },
  tabText: { fontWeight: '500', color: '#5F6368' },
  activeTabText: { color: '#1A73E8' },

  card: { flexDirection: 'row', marginBottom: 20, alignItems: 'flex-start' },
  iconSquare: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#F1F3F4', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  cardTitle: { fontWeight: 'bold', fontSize: 16, color: '#202124' },
  cardSub: { color: '#5F6368', fontSize: 13, marginVertical: 2 },
  status: { fontSize: 12, fontWeight: '500' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 30 },
  modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 15, elevation: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 10 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  cancelBtn: { padding: 10 },
  confirmBtn: { backgroundColor: '#1A73E8', padding: 10, borderRadius: 8, paddingHorizontal: 20 },
});