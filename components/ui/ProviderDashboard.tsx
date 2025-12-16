// components/ui/ProviderDashboard.tsx - PHIÊN BẢN HOÀN THIỆN
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { auth, db } from "../../firebaseConfig";

interface Toilet {
  id: string;
  name: string;
  address: string;
  price: number;
  status: string;
  rating: number;
  ratingCount: number;
  amenities: string[];
}

interface Stats {
  total: number;
  approved: number;
  pending: number;
  totalRevenue: number;
  todayBookings: number;
  activeBookings: number;
  totalRooms: number;
}

export default function ProviderDashboard() {
  const router = useRouter();
  const user = auth.currentUser;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myToilets, setMyToilets] = useState<Toilet[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    approved: 0,
    pending: 0,
    totalRevenue: 0,
    todayBookings: 0,
    activeBookings: 0,
    totalRooms: 0,
  });

  // Modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [roomsModalVisible, setRoomsModalVisible] = useState(false);

  const [editingToilet, setEditingToilet] = useState<Toilet | null>(null);
  const [selectedQRToilet, setSelectedQRToilet] = useState<Toilet | null>(null);
  const [selectedToiletRooms, setSelectedToiletRooms] = useState<any[]>([]);

  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editAddress, setEditAddress] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      if (!refreshing) setLoading(true);

      // 1. Fetch toilets
      const qToilets = query(
        collection(db, "toilets"),
        where("createdBy", "==", user.email)
      );

      const unsubscribe = onSnapshot(qToilets, async (snapshot) => {
        const list: Toilet[] = [];
        let approved = 0,
          pending = 0;

        snapshot.forEach((doc) => {
          const data = doc.data() as any;
          list.push({
            id: doc.id,
            name: data.name,
            address: data.address,
            price: data.price || 0,
            status: data.status,
            rating: data.rating || 5.0,
            ratingCount: data.ratingCount || 0,
            amenities: data.amenities || [],
          });

          if (data.status === "approved") approved++;
          else pending++;
        });

        setMyToilets(list);

        // 2. Fetch bookings & rooms statistics
        await fetchAdditionalStats(list, approved, pending);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Lỗi fetch dashboard:", error);
      Alert.alert("Lỗi", "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAdditionalStats = async (
    toiletList: Toilet[],
    approved: number,
    pending: number
  ) => {
    try {
      const toiletIds = toiletList.map((t) => t.id);

      if (toiletIds.length === 0) {
        setStats({
          total: 0,
          approved: 0,
          pending: 0,
          totalRevenue: 0,
          todayBookings: 0,
          activeBookings: 0,
          totalRooms: 0,
        });
        return;
      }

      // Fetch bookings (với chunking nếu cần)
      const chunks = [];
      const CHUNK_SIZE = 10;
      for (let i = 0; i < toiletIds.length; i += CHUNK_SIZE) {
        chunks.push(toiletIds.slice(i, i + CHUNK_SIZE));
      }

      let todayBookings = 0;
      let activeBookings = 0;
      let totalRevenue = 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const chunk of chunks) {
        const qBookings = query(
          collection(db, "bookings"),
          where("toiletId", "in", chunk)
        );
        const snapBookings = await getDocs(qBookings);

        snapBookings.forEach((doc) => {
          const booking = doc.data();

          // Today's bookings
          const bookingDate = new Date(booking.bookingTime);
          if (bookingDate >= today) {
            todayBookings++;
          }

          // Active bookings
          if (["pending", "confirmed", "checked_in"].includes(booking.status)) {
            activeBookings++;
          }

          // Revenue (completed bookings)
          if (
            booking.status === "completed" &&
            booking.paymentStatus === "paid"
          ) {
            totalRevenue += booking.totalPrice || 0;
          }
        });
      }

      // Fetch rooms count
      let totalRooms = 0;
      for (const chunk of chunks) {
        const qRooms = query(
          collection(db, "rooms"),
          where("toiletId", "in", chunk)
        );
        const snapRooms = await getDocs(qRooms);
        totalRooms += snapRooms.size;
      }

      setStats({
        total: toiletList.length,
        approved,
        pending,
        totalRevenue,
        todayBookings,
        activeBookings,
        totalRooms,
      });
    } catch (error) {
      console.error("Lỗi fetch stats:", error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // CRUD Operations
  const handleEdit = (item: Toilet) => {
    setEditingToilet(item);
    setEditName(item.name);
    setEditPrice(String(item.price));
    setEditAddress(item.address);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingToilet) return;

    try {
      await updateDoc(doc(db, "toilets", editingToilet.id), {
        name: editName.trim(),
        price: Number(editPrice),
        address: editAddress.trim(),
        updatedAt: new Date().toISOString(),
      });

      Alert.alert("✅ Thành công", "Đã cập nhật thông tin!");
      setEditModalVisible(false);
    } catch (error: any) {
      Alert.alert("❌ Lỗi", error.message);
    }
  };

  const handleDelete = (item: Toilet) => {
    Alert.alert(
      "⚠️ Xác nhận xóa",
      `Xóa "${item.name}"?\n\nCảnh báo: Thao tác này không thể hoàn tác!`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              // Xóa toilet
              await deleteDoc(doc(db, "toilets", item.id));

              // Xóa các phòng liên quan
              const qRooms = query(
                collection(db, "rooms"),
                where("toiletId", "==", item.id)
              );
              const roomsSnap = await getDocs(qRooms);
              const deletePromises = roomsSnap.docs.map((d) =>
                deleteDoc(d.ref)
              );
              await Promise.all(deletePromises);

              Alert.alert("✅ Đã xóa", "Địa điểm đã được xóa khỏi hệ thống");
            } catch (error: any) {
              Alert.alert("❌ Lỗi", error.message);
            }
          },
        },
      ]
    );
  };

  const handleShowQR = (item: Toilet) => {
    setSelectedQRToilet(item);
    setQrModalVisible(true);
  };

  const handleShowRooms = async (item: Toilet) => {
    try {
      const qRooms = query(
        collection(db, "rooms"),
        where("toiletId", "==", item.id)
      );
      const snap = await getDocs(qRooms);
      const rooms = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      setSelectedToiletRooms(rooms);
      setRoomsModalVisible(true);
    } catch (error) {
      Alert.alert("Lỗi", "Không thể tải danh sách phòng");
    }
  };

  // Navigation
  const navigateToBookings = () => {
    router.push("/(tabs)/bookings");
  };

  const navigateToAddFacility = () => {
    router.push("/(tabs)/profile");
  };

  // Render
  const renderToiletItem = ({ item }: { item: Toilet }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  item.status === "approved" ? "#E8F5E9" : "#FFF3E0",
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: item.status === "approved" ? "#4CAF50" : "#FF9800" },
              ]}
            >
              {item.status === "approved" ? "✓ Hoạt động" : "⏳ Chờ duyệt"}
            </Text>
          </View>
        </View>

        <Text style={styles.cardAddress} numberOfLines={1}>
          📍 {item.address}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={styles.priceText}>
            {item.price === 0 ? "Miễn phí" : `${item.price.toLocaleString()}đ`}
          </Text>
          <View style={styles.ratingBox}>
            <Ionicons name="star" size={12} color="#FBC02D" />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({item.ratingCount})</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionColumn}>
        <TouchableOpacity
          onPress={() => handleShowRooms(item)}
          style={styles.iconBtn}
        >
          <Ionicons name="bed" size={18} color="#2196F3" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleShowQR(item)}
          style={styles.iconBtn}
        >
          <Ionicons name="qr-code" size={18} color="#4CAF50" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleEdit(item)}
          style={styles.iconBtn}
        >
          <Ionicons name="create" size={18} color="#FF9800" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleDelete(item)}
          style={styles.iconBtn}
        >
          <Ionicons name="trash" size={18} color="#F44336" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={myToilets}
        renderItem={renderToiletItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2196F3"]}
          />
        }
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Dashboard Kinh Doanh</Text>
              <TouchableOpacity
                onPress={navigateToAddFacility}
                style={styles.addBtn}
              >
                <Ionicons name="add-circle" size={24} color="white" />
              </TouchableOpacity>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsSection}>
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: "#E3F2FD" }]}>
                  <Ionicons name="business" size={24} color="#2196F3" />
                  <Text style={styles.statValue}>{stats.total}</Text>
                  <Text style={styles.statLabel}>Địa điểm</Text>
                </View>

                <View style={[styles.statCard, { backgroundColor: "#E8F5E9" }]}>
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                  <Text style={styles.statValue}>{stats.approved}</Text>
                  <Text style={styles.statLabel}>Đã duyệt</Text>
                </View>

                <View style={[styles.statCard, { backgroundColor: "#FFF3E0" }]}>
                  <Ionicons name="time" size={24} color="#FF9800" />
                  <Text style={styles.statValue}>{stats.pending}</Text>
                  <Text style={styles.statLabel}>Chờ duyệt</Text>
                </View>
              </View>

              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: "#F3E5F5" }]}>
                  <Ionicons name="cash" size={24} color="#9C27B0" />
                  <Text style={styles.statValue}>
                    {(stats.totalRevenue / 1000).toFixed(0)}K
                  </Text>
                  <Text style={styles.statLabel}>Doanh thu</Text>
                </View>

                <View style={[styles.statCard, { backgroundColor: "#E0F2F1" }]}>
                  <Ionicons name="calendar" size={24} color="#00796B" />
                  <Text style={styles.statValue}>{stats.todayBookings}</Text>
                  <Text style={styles.statLabel}>Hôm nay</Text>
                </View>

                <View style={[styles.statCard, { backgroundColor: "#FFEBEE" }]}>
                  <Ionicons name="people" size={24} color="#C62828" />
                  <Text style={styles.statValue}>{stats.activeBookings}</Text>
                  <Text style={styles.statLabel}>Đang hoạt động</Text>
                </View>
              </View>

              {/* Quick Actions */}
              <View style={styles.quickActions}>
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={navigateToBookings}
                >
                  <Ionicons name="calendar-outline" size={28} color="#2196F3" />
                  <Text style={styles.actionText}>Quản lý đặt chỗ</Text>
                  {stats.activeBookings > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {stats.activeBookings}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={navigateToAddFacility}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={28}
                    color="#4CAF50"
                  />
                  <Text style={styles.actionText}>Thêm địa điểm</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Địa điểm của tôi ({myToilets.length})
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="storefront-outline" size={80} color="#E0E0E0" />
            <Text style={styles.emptyTitle}>Chưa có địa điểm nào</Text>
            <Text style={styles.emptySubtitle}>
              Thêm địa điểm đầu tiên để bắt đầu kinh doanh!
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={navigateToAddFacility}
            >
              <Ionicons name="add-circle" size={24} color="white" />
              <Text style={styles.emptyBtnText}>Thêm ngay</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Edit Modal */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chỉnh sửa thông tin</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Tên địa điểm"
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
              placeholder="Giá vé (VNĐ)"
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEdit}
                style={styles.confirmBtn}
              >
                <Text style={styles.confirmBtnText}>Lưu thay đổi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* QR Modal */}
      <Modal visible={qrModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mã QR Check-in</Text>
              <TouchableOpacity onPress={() => setQrModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.qrSubtitle}>
              In và dán mã này tại quầy để khách check-in
            </Text>

            {selectedQRToilet && (
              <View style={styles.qrWrapper}>
                <QRCode
                  value={`STORE_${selectedQRToilet.id}`}
                  size={220}
                  logoBackgroundColor="transparent"
                />
              </View>
            )}

            <Text style={styles.storeName}>{selectedQRToilet?.name}</Text>
            <Text style={styles.storeId}>
              ID: STORE_{selectedQRToilet?.id.slice(0, 8).toUpperCase()}
            </Text>

            <TouchableOpacity
              style={styles.printBtn}
              onPress={() =>
                Alert.alert("Thông báo", "Vui lòng chụp màn hình để in mã QR")
              }
            >
              <Ionicons name="print" size={20} color="white" />
              <Text style={styles.printBtnText}>Hướng dẫn in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Rooms Modal */}
      <Modal visible={roomsModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.roomsModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Danh sách phòng</Text>
              <TouchableOpacity onPress={() => setRoomsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.roomsList}>
              {selectedToiletRooms.length === 0 ? (
                <Text style={styles.noRoomsText}>
                  Chưa có phòng nào. Vui lòng thêm phòng trong phần quản lý.
                </Text>
              ) : (
                selectedToiletRooms.map((room) => (
                  <View key={room.id} style={styles.roomCard}>
                    <View style={styles.roomHeader}>
                      <Text style={styles.roomNumber}>
                        Phòng {room.roomNumber}
                      </Text>
                      <View
                        style={[
                          styles.roomStatusBadge,
                          {
                            backgroundColor:
                              room.status === "available"
                                ? "#E8F5E9"
                                : room.status === "occupied"
                                ? "#FFEBEE"
                                : "#FFF3E0",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.roomStatusText,
                            {
                              color:
                                room.status === "available"
                                  ? "#4CAF50"
                                  : room.status === "occupied"
                                  ? "#F44336"
                                  : "#FF9800",
                            },
                          ]}
                        >
                          {room.status === "available"
                            ? "Trống"
                            : room.status === "occupied"
                            ? "Đang dùng"
                            : "Đã đặt"}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.roomType}>
                      Loại:{" "}
                      {room.type === "single"
                        ? "Đơn"
                        : room.type === "couple"
                        ? "Đôi"
                        : "Gia đình"}
                    </Text>
                    <Text style={styles.roomPrice}>
                      {room.price?.toLocaleString()}đ / lượt
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
  },
  loadingText: { marginTop: 10, color: "#666", fontSize: 14 },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#2196F3",
    padding: 20,
    paddingTop: 60,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "white" },
  addBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 25,
    padding: 8,
  },

  // Stats
  statsSection: { padding: 20 },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 8,
  },
  statLabel: { fontSize: 11, color: "#666", marginTop: 4 },

  // Quick Actions
  quickActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "white",
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
    elevation: 2,
    position: "relative",
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    marginTop: 8,
    textAlign: "center",
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#F44336",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
  },
  badgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
  },

  // Section
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },

  // List
  listContent: { paddingBottom: 20 },

  // Card
  card: {
    flexDirection: "row",
    backgroundColor: "white",
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 15,
    borderRadius: 16,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: "#2196F3",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: { fontSize: 10, fontWeight: "bold" },
  cardAddress: {
    fontSize: 13,
    color: "#666",
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2196F3",
  },
  ratingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#333",
  },
  reviewCount: { fontSize: 12, color: "#999" },

  // Action Column
  actionColumn: {
    justifyContent: "space-around",
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: "#f0f0f0",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 30,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2196F3",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  emptyBtnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: "#F9F9F9",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  cancelBtnText: { color: "#666", fontWeight: "bold" },
  confirmBtn: {
    flex: 1,
    backgroundColor: "#2196F3",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmBtnText: { color: "white", fontWeight: "bold" },

  // QR Modal
  qrModalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    maxWidth: 360,
  },
  qrSubtitle: {
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  qrWrapper: {
    padding: 20,
    backgroundColor: "white",
    borderRadius: 16,
    elevation: 5,
    marginBottom: 20,
  },
  storeName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 5,
  },
  storeId: {
    fontSize: 12,
    color: "#999",
    fontFamily: "monospace",
    marginBottom: 20,
  },
  printBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2196F3",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    gap: 8,
  },
  printBtnText: {
    color: "white",
    fontWeight: "bold",
  },

  // Rooms Modal
  roomsModalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    maxHeight: "70%",
  },
  roomsList: {
    marginTop: 10,
  },
  noRoomsText: {
    textAlign: "center",
    color: "#999",
    padding: 40,
  },
  roomCard: {
    backgroundColor: "#F9F9F9",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#2196F3",
  },
  roomHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  roomNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  roomStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roomStatusText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  roomType: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  roomPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2196F3",
  },
});
