import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateProfile } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
// 👉 Sửa đường dẫn import
import { auth, db } from '../../firebaseConfig';

export default function UserProfile() {
  const router = useRouter();
  const user = auth.currentUser;
  
  const [activeTab, setActiveTab] = useState('history');
  const [dataList, setDataList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || '');
  const [passModalVisible, setPassModalVisible] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let q;
      if (activeTab === 'history') {
        q = query(collection(db, "history"), where("email", "==", user.email));
      } else {
        q = query(collection(db, "toilets"), where("createdBy", "==", user.email));
      }
      const querySnapshot = await getDocs(q);
      const list: any[] = [];
      querySnapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      
      if (activeTab === 'history') {
         list.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      } else {
         list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
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

  const handleChangePassword = async () => {
    if (!user || !user.email) return;
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPass);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPass);
      Alert.alert("Thành công", "Vui lòng đăng nhập lại!");
      auth.signOut().then(() => router.replace('/login'));
    } catch (error: any) { Alert.alert("Lỗi", error.message); }
  };

  const handleLogout = () => {
    Alert.alert("Đăng xuất", "Bạn chắc chưa?", [
      { text: "Hủy", style: "cancel" },
      { text: "Có", style: "destructive", onPress: () => auth.signOut().then(() => router.replace('/login')) }
    ]);
  };

  const renderItem = ({ item }: { item: any }) => {
    if (activeTab === 'history') {
      return (
        <View style={styles.itemCard}>
          <View style={[styles.iconBox, {backgroundColor: '#E8F5E9'}]}>
             <Ionicons name="time" size={20} color="#4CAF50" />
          </View>
          <View style={{flex: 1}}>
            <Text style={styles.itemName}>{item.wcName}</Text>
            <Text style={styles.itemSub}>{item.time}</Text>
          </View>
          <Text style={styles.itemPrice}>-{item.price}đ</Text>
        </View>
      );
    } else {
      return (
        <View style={styles.itemCard}>
          <View style={[styles.iconBox, {backgroundColor: '#E3F2FD'}]}>
             <Ionicons name="location" size={20} color="#2196F3" />
          </View>
          <View style={{flex: 1}}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemSub}>{item.address}</Text>
            <Text style={[styles.statusText, { color: item.status === 'approved' ? 'green' : 'orange' }]}>
               • {item.status === 'approved' ? 'Đã duyệt' : 'Đang chờ duyệt'}
            </Text>
          </View>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
             <Image source={{ uri: user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName || 'User'}&background=random` }} style={styles.avatar} />
            <TouchableOpacity style={styles.editIcon} onPress={() => setEditModalVisible(true)}>
                <Ionicons name="pencil" size={14} color="white" />
            </TouchableOpacity>
        </View>
        <Text style={styles.displayName}>{user?.displayName || "Chưa đặt tên"}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setEditModalVisible(true)}>
                <Ionicons name="person-circle-outline" size={20} color="#555" />
                <Text style={styles.actionText}>Sửa hồ sơ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setPassModalVisible(true)}>
                <Ionicons name="lock-closed-outline" size={20} color="#555" />
                <Text style={styles.actionText}>Đổi mật khẩu</Text>
            </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tabButton, activeTab === 'history' && styles.activeTab]} onPress={() => setActiveTab('history')}>
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>Lịch sử</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabButton, activeTab === 'contributions' && styles.activeTab]} onPress={() => setActiveTab('contributions')}>
            <Text style={[styles.tabText, activeTab === 'contributions' && styles.activeTabText]}>Đóng góp</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listContainer}>
          {loading ? <ActivityIndicator size="large" color="#2196F3" style={{marginTop: 20}} /> : (
              <FlatList data={dataList} renderItem={renderItem} keyExtractor={(item) => item.id} ListEmptyComponent={<Text style={styles.emptyText}>Trống trơn... 🍃</Text>} contentContainerStyle={{ paddingBottom: 80 }} />
          )}
      </View>

      <TouchableOpacity style={styles.logoutFloatParams} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="white" />
      </TouchableOpacity>

      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Cập nhật tên</Text>
                <TextInput style={styles.input} value={newName} onChangeText={setNewName} placeholder="Nhập tên mới..." />
                <View style={styles.modalButtons}>
                    <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.cancelBtn}><Text>Hủy</Text></TouchableOpacity>
                    <TouchableOpacity onPress={handleUpdateProfile} style={styles.confirmBtn}><Text style={{color: 'white'}}>Lưu</Text></TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

      <Modal visible={passModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Đổi mật khẩu</Text>
                <TextInput style={styles.input} value={currentPass} onChangeText={setCurrentPass} placeholder="Mật khẩu cũ" secureTextEntry />
                <TextInput style={styles.input} value={newPass} onChangeText={setNewPass} placeholder="Mật khẩu mới" secureTextEntry />
                <View style={styles.modalButtons}>
                    <TouchableOpacity onPress={() => setPassModalVisible(false)} style={styles.cancelBtn}><Text>Hủy</Text></TouchableOpacity>
                    <TouchableOpacity onPress={handleChangePassword} style={styles.confirmBtn}><Text style={{color: 'white'}}>Đổi</Text></TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { backgroundColor: 'white', padding: 20, paddingTop: 50, alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5 },
  avatarContainer: { position: 'relative', marginBottom: 10 },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  editIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#2196F3', padding: 6, borderRadius: 15, borderWidth: 2, borderColor: 'white' },
  displayName: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  email: { fontSize: 14, color: '#666', marginBottom: 15 },
  actionRow: { flexDirection: 'row', gap: 15 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#f0f2f5', borderRadius: 20, paddingHorizontal: 15 },
  actionText: { marginLeft: 5, fontSize: 12, fontWeight: '600', color: '#555' },
  tabContainer: { flexDirection: 'row', margin: 20, backgroundColor: '#e0e0e0', borderRadius: 12, padding: 4 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: 'white', elevation: 2 },
  tabText: { fontWeight: '600', color: '#666' },
  activeTabText: { color: '#2196F3', fontWeight: 'bold' },
  listContainer: { flex: 1, paddingHorizontal: 20 },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 2 },
  iconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  itemSub: { fontSize: 12, color: '#888' },
  itemPrice: { fontSize: 14, fontWeight: 'bold', color: '#FF5252' },
  statusText: { fontSize: 12, fontWeight: 'bold', marginTop: 2 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999' },
  logoutFloatParams: { position: 'absolute', bottom: 20, right: 20, width: 50, height: 50, borderRadius: 25, backgroundColor: '#FF5252', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 30 },
  modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 15, elevation: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 10 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  cancelBtn: { padding: 10 },
  confirmBtn: { backgroundColor: '#2196F3', padding: 10, borderRadius: 8, paddingHorizontal: 20 },
});