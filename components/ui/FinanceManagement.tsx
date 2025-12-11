import { Ionicons } from '@expo/vector-icons';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../../firebaseConfig';

interface Toilet {
  id: string;
  name: string;
  price: number;
  ratingCount: number;
}

interface Transaction {
  id: string;
  toiletName: string;
  amount: number;
  date: string;
  type: 'checkin' | 'subscription';
}

export default function FinanceManagement() {
  const [toilets, setToilets] = useState<Toilet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedToilet, setSelectedToilet] = useState<Toilet | null>(null);
  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [newPrice, setNewPrice] = useState('');
  
  // Thống kê
  const [stats, setStats] = useState({
    totalRevenue: 0,
    monthRevenue: 0,
    todayRevenue: 0,
    totalTransactions: 0
  });

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Lấy danh sách WC của provider
      const qToilets = query(
        collection(db, "toilets"),
        where("createdBy", "==", user?.email)
      );
      const snapToilets = await getDocs(qToilets);
      const toiletList: Toilet[] = [];
      snapToilets.forEach(doc => {
        const data = doc.data();
        toiletList.push({
          id: doc.id,
          name: data.name,
          price: data.price || 0,
          ratingCount: data.ratingCount || 0
        });
      });
      setToilets(toiletList);

      // Lấy lịch sử giao dịch (history)
      const toiletNames = toiletList.map(t => t.name);
      if (toiletNames.length > 0) {
        const qHistory = query(
          collection(db, "history"),
          where("wcName", "in", toiletNames)
        );
        const snapHistory = await getDocs(qHistory);
        const transList: Transaction[] = [];
        let total = 0;
        let monthTotal = 0;
        let todayTotal = 0;
        
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        snapHistory.forEach(doc => {
          const data = doc.data();
          const amount = data.price || 0;
          const transDate = new Date(data.time);
          
          transList.push({
            id: doc.id,
            toiletName: data.wcName,
            amount: amount,
            date: data.time,
            type: 'checkin'
          });

          total += amount;
          if (transDate >= monthStart) monthTotal += amount;
          if (transDate >= todayStart) todayTotal += amount;
        });

        setTransactions(transList.reverse());
        setStats({
          totalRevenue: total,
          monthRevenue: monthTotal,
          todayRevenue: todayTotal,
          totalTransactions: transList.length
        });
      }

      setLoading(false);
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  const handleUpdatePrice = async () => {
    if (!selectedToilet || !newPrice) return;
    
    try {
      const toiletRef = doc(db, "toilets", selectedToilet.id);
      await updateDoc(toiletRef, {
        price: Number(newPrice)
      });
      
      Alert.alert("Thành công", "Đã cập nhật giá mới!");
      setPriceModalVisible(false);
      fetchData();
    } catch (error: any) {
      Alert.alert("Lỗi", error.message);
    }
  };

  const renderToiletItem = ({ item }: { item: Toilet }) => (
    <View style={styles.toiletCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toiletName}>{item.name}</Text>
        <Text style={styles.priceText}>
          {item.price === 0 ? "Miễn phí" : `${item.price.toLocaleString()}đ`}
        </Text>
        <Text style={styles.visitsText}>
          {item.ratingCount} lượt sử dụng
        </Text>
      </View>
      <TouchableOpacity
        style={styles.editPriceBtn}
        onPress={() => {
          setSelectedToilet(item);
          setNewPrice(item.price.toString());
          setPriceModalVisible(true);
        }}
      >
        <Ionicons name="create-outline" size={20} color="#2196F3" />
        <Text style={styles.editPriceText}>Sửa giá</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTransactionItem = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transIcon}>
        <Ionicons name="cash-outline" size={24} color="#4CAF50" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.transName}>{item.toiletName}</Text>
        <Text style={styles.transDate}>{item.date}</Text>
      </View>
      <Text style={styles.transAmount}>+{item.amount.toLocaleString()}đ</Text>
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
    <ScrollView style={styles.container}>
      {/* Header Stats */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý tài chính 💰</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalRevenue.toLocaleString()}đ</Text>
            <Text style={styles.statLabel}>Tổng doanh thu</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.monthRevenue.toLocaleString()}đ</Text>
            <Text style={styles.statLabel}>Tháng này</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.todayRevenue.toLocaleString()}đ</Text>
            <Text style={styles.statLabel}>Hôm nay</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalTransactions}</Text>
            <Text style={styles.statLabel}>Giao dịch</Text>
          </View>
        </View>
      </View>

      {/* Quản lý giá */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bảng giá địa điểm</Text>
        <FlatList
          data={toilets}
          renderItem={renderToiletItem}
          keyExtractor={item => item.id}
          scrollEnabled={false}
        />
      </View>

      {/* Lịch sử giao dịch */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lịch sử giao dịch</Text>
        <FlatList
          data={transactions}
          renderItem={renderTransactionItem}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Chưa có giao dịch nào</Text>
          }
        />
      </View>

      {/* Modal sửa giá */}
      <Modal
        visible={priceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPriceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cập nhật giá</Text>
            <Text style={styles.modalSubtitle}>{selectedToilet?.name}</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Nhập giá mới (VNĐ)"
              keyboardType="numeric"
              value={newPrice}
              onChangeText={setNewPrice}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setPriceModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleUpdatePrice}
              >
                <Text style={styles.modalConfirmText}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 20,
    paddingTop: 60,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5
  },
  statLabel: {
    fontSize: 12,
    color: '#666'
  },
  section: {
    padding: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15
  },
  toiletCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2
  },
  toiletName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 5
  },
  visitsText: {
    fontSize: 12,
    color: '#666'
  },
  editPriceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20
  },
  editPriceText: {
    marginLeft: 5,
    color: '#2196F3',
    fontWeight: 'bold',
    fontSize: 12
  },
  transactionCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1
  },
  transIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  transName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3
  },
  transDate: {
    fontSize: 12,
    color: '#666'
  },
  transAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 30
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    elevation: 10
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10
  },
  modalCancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  modalCancelText: {
    color: '#666',
    fontWeight: 'bold'
  },
  modalConfirmBtn: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  modalConfirmText: {
    color: 'white',
    fontWeight: 'bold'
  }
});