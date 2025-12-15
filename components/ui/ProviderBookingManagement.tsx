// components/ui/ProviderBookingManagement.tsx
import { Ionicons } from '@expo/vector-icons';
import { collection, doc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../../firebaseConfig';

interface Booking {
  id: string;
  userName: string;
  userPhone: string;
  roomNumber: string;
  estimatedArrival: string;
  expiryTime: string;
  status: string;
  qrCode: string;
  totalPrice: number;
  notes?: string;
  bookingTime: string;
}

export default function ProviderBookingManagement() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    fetchBookings();
  }, [activeTab]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      // Lấy danh sách WC của provider
      const qToilets = query(
        collection(db, 'toilets'),
        where('createdBy', '==', user?.email)
      );
      const toiletSnap = await getDocs(qToilets);
      const toiletIds: string[] = [];
      toiletSnap.forEach(doc => toiletIds.push(doc.id));

      if (toiletIds.length === 0) {
        setBookings([]);
        setLoading(false);
        return;
      }

      // Lấy bookings
      let q;
      if (activeTab === 'active') {
        q = query(
          collection(db, 'bookings'),
          where('toiletId', 'in', toiletIds),
          where('status', 'in', ['pending', 'confirmed', 'checked_in'])
        );
      } else {
        q = query(
          collection(db, 'bookings'),
          where('toiletId', 'in', toiletIds),
          where('status', 'in', ['completed', 'cancelled', 'expired'])
        );
      }

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: Booking[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          list.push({
            id: doc.id,
            userName: data.userName,
            userPhone: data.userPhone,
            roomNumber: data.roomNumber,
            estimatedArrival: data.estimatedArrival,
            expiryTime: data.expiryTime,
            status: data.status,
            qrCode: data.qrCode,
            totalPrice: data.totalPrice,
            notes: data.notes,
            bookingTime: data.bookingTime
          });
        });

        // Sắp xếp theo thời gian đặt (mới nhất trước)
        list.sort((a, b) => 
          new Date(b.bookingTime).getTime() - new Date(a.bookingTime).getTime()
        );

        setBookings(list);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const handleCallCustomer = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleCancelBooking = async (bookingId: string, roomId: string) => {
    Alert.alert(
      'Hủy đặt chỗ',
      'Bạn có chắc muốn hủy đặt chỗ này?',
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Hủy booking',
          style: 'destructive',
          onPress: async () => {
            try {
              // Cập nhật booking
              await updateDoc(doc(db, 'bookings', bookingId), {
                status: 'cancelled',
                updatedAt: new Date().toISOString()
              });

              // Giải phóng phòng
              await updateDoc(doc(db, 'rooms', roomId), {
                status: 'available',
                currentBookingId: null,
                lastUpdated: new Date().toISOString()
              });

              Alert.alert('Thành công', 'Đã hủy booking và giải phóng phòng');
            } catch (error: any) {
              Alert.alert('Lỗi', error.message);
            }
          }
        }
      ]
    );
  };

  const handleExtendTime = async (bookingId: string) => {
    Alert.alert(
      'Gia hạn thời gian',
      'Gia hạn thêm 15 phút cho booking này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Gia hạn',
          onPress: async () => {
            try {
              const newExpiry = new Date(Date.now() + 15 * 60000).toISOString();
              await updateDoc(doc(db, 'bookings', bookingId), {
                expiryTime: newExpiry,
                updatedAt: new Date().toISOString()
              });
              Alert.alert('Đã gia hạn', 'Thêm 15 phút giữ chỗ');
            } catch (error: any) {
              Alert.alert('Lỗi', error.message);
            }
          }
        }
      ]
    );
  };

  const handleCheckIn = async (bookingId: string, roomId: string) => {
    Alert.alert(
      'Xác nhận Check-in',
      'Khách hàng đã đến và quét QR thành công?',
      [
        { text: 'Chưa', style: 'cancel' },
        {
          text: 'Check-in',
          onPress: async () => {
            try {
              const now = new Date().toISOString();
              
              // Cập nhật booking
              await updateDoc(doc(db, 'bookings', bookingId), {
                status: 'checked_in',
                checkInTime: now,
                updatedAt: now
              });

              // Cập nhật phòng
              await updateDoc(doc(db, 'rooms', roomId), {
                status: 'occupied',
                lastUpdated: now
              });

              Alert.alert('✅ Check-in thành công', 'Khách đã vào phòng');
            } catch (error: any) {
              Alert.alert('Lỗi', error.message);
            }
          }
        }
      ]
    );
  };

  const handleCheckOut = async (bookingId: string, roomId: string, price: number) => {
    Alert.alert(
      'Xác nhận Check-out',
      `Tổng tiền: ${price.toLocaleString()}đ\n\nKhách đã thanh toán?`,
      [
        { text: 'Chưa', style: 'cancel' },
        {
          text: 'Đã thanh toán',
          onPress: async () => {
            try {
              const now = new Date().toISOString();
              
              // Cập nhật booking
              await updateDoc(doc(db, 'bookings', bookingId), {
                status: 'completed',
                checkOutTime: now,
                paymentStatus: 'paid',
                updatedAt: now
              });

              // Giải phóng phòng
              await updateDoc(doc(db, 'rooms', roomId), {
                status: 'available',
                currentBookingId: null,
                lastUpdated: now
              });

              Alert.alert('✅ Hoàn tất', 'Khách đã check-out thành công');
            } catch (error: any) {
              Alert.alert('Lỗi', error.message);
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#FF9800',
      confirmed: '#2196F3',
      checked_in: '#4CAF50',
      completed: '#9E9E9E',
      cancelled: '#F44336',
      expired: '#9E9E9E'
    };
    return colors[status] || '#999';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Chờ xác nhận',
      confirmed: 'Đã xác nhận',
      checked_in: 'Đang sử dụng',
      completed: 'Hoàn thành',
      cancelled: 'Đã hủy',
      expired: 'Hết hạn'
    };
    return labels[status] || status;
  };

  const getTimeRemaining = (expiryTime: string) => {
    const now = Date.now();
    const expiry = new Date(expiryTime).getTime();
    const diff = expiry - now;

    if (diff <= 0) return 'Hết hạn';

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    if (minutes > 0) {
      return `${minutes}p${seconds}s`;
    }
    return `${seconds}s`;
  };

  const renderBookingItem = ({ item }: { item: Booking }) => {
    const isActive = ['pending', 'confirmed', 'checked_in'].includes(item.status);
    const timeRemaining = isActive ? getTimeRemaining(item.expiryTime) : null;

    return (
      <TouchableOpacity
        style={styles.bookingCard}
        onPress={() => {
          setSelectedBooking(item);
          setDetailModalVisible(true);
        }}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.roomNumber}>Phòng {item.roomNumber}</Text>
            <Text style={styles.customerName}>{item.userName}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="call" size={14} color="#666" />
            <Text style={styles.infoText}>{item.userPhone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time" size={14} color="#666" />
            <Text style={styles.infoText}>
              ETA: {new Date(item.estimatedArrival).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
          {timeRemaining && (
            <View style={styles.infoRow}>
              <Ionicons name="timer" size={14} color="#FF5722" />
              <Text style={[styles.infoText, { color: '#FF5722', fontWeight: 'bold' }]}>
                Còn: {timeRemaining}
              </Text>
            </View>
          )}
        </View>

        {isActive && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleCallCustomer(item.userPhone)}
            >
              <Ionicons name="call" size={18} color="#4CAF50" />
            </TouchableOpacity>

            {item.status === 'pending' && (
              <>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleExtendTime(item.id)}
                >
                  <Ionicons name="time" size={18} color="#2196F3" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleCancelBooking(item.id, item.roomNumber)}
                >
                  <Ionicons name="close-circle" size={18} color="#F44336" />
                </TouchableOpacity>
              </>
            )}

            {item.status === 'pending' && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.checkInBtn]}
                onPress={() => handleCheckIn(item.id, item.roomNumber)}
              >
                <Ionicons name="log-in" size={18} color="white" />
              </TouchableOpacity>
            )}

            {item.status === 'checked_in' && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.checkOutBtn]}
                onPress={() => handleCheckOut(item.id, item.roomNumber, item.totalPrice)}
              >
                <Ionicons name="log-out" size={18} color="white" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý đặt chỗ</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {bookings.filter(b => b.status === 'pending').length}
            </Text>
            <Text style={styles.statLabel}>Chờ</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {bookings.filter(b => b.status === 'checked_in').length}
            </Text>
            <Text style={styles.statLabel}>Đang dùng</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            Đang hoạt động
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            Lịch sử
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color="#2196F3" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={bookings}
          renderItem={renderBookingItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {activeTab === 'active' ? 'Chưa có đặt chỗ nào' : 'Chưa có lịch sử'}
            </Text>
          }
        />
      )}

      {/* Detail Modal */}
      <Modal
        visible={detailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết đặt chỗ</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedBooking && (
              <View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phòng:</Text>
                  <Text style={styles.detailValue}>{selectedBooking.roomNumber}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Khách hàng:</Text>
                  <Text style={styles.detailValue}>{selectedBooking.userName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>SĐT:</Text>
                  <Text style={styles.detailValue}>{selectedBooking.userPhone}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Giá:</Text>
                  <Text style={styles.detailValue}>
                    {selectedBooking.totalPrice.toLocaleString()}đ
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Trạng thái:</Text>
                  <Text style={[
                    styles.detailValue,
                    { color: getStatusColor(selectedBooking.status) }
                  ]}>
                    {getStatusLabel(selectedBooking.status)}
                  </Text>
                </View>
                {selectedBooking.notes && (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>Ghi chú:</Text>
                    <Text style={styles.notesText}>{selectedBooking.notes}</Text>
                  </View>
                )}
                <View style={styles.qrBox}>
                  <Text style={styles.qrLabel}>Mã QR:</Text>
                  <Text style={styles.qrCode}>{selectedBooking.qrCode}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: '#2196F3',
    padding: 20,
    paddingTop: 60,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white', marginBottom: 15 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: {
    flex: 1,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center'
  },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#FF5722' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 5 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 15 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#2196F3' },
  tabText: { fontWeight: '500', color: '#666' },
  activeTabText: { color: '#2196F3', fontWeight: 'bold' },
  listContainer: { padding: 20 },
  bookingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    elevation: 2
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  roomNumber: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  customerName: { fontSize: 14, color: '#666', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusText: { fontSize: 11, color: 'white', fontWeight: 'bold' },
  cardBody: { marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5, gap: 8 },
  infoText: { fontSize: 13, color: '#666' },
  actionButtons: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkInBtn: { backgroundColor: '#4CAF50' },
  checkOutBtn: { backgroundColor: '#FF5722' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 50 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  detailLabel: { fontSize: 14, color: '#666' },
  detailValue: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  notesBox: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginTop: 15
  },
  notesLabel: { fontSize: 12, color: '#666', marginBottom: 5 },
  notesText: { fontSize: 14, color: '#333' },
  qrBox: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 15
  },
  qrLabel: { fontSize: 12, color: '#1976D2', marginBottom: 5 },
  qrCode: { fontSize: 12, color: '#333', fontFamily: 'monospace' }
});