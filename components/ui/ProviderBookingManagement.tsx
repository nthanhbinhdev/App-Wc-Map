// components/ui/ProviderBookingManagement.tsx
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../firebaseConfig";

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
  toiletId: string;
  toiletName: string;
}

export default function ProviderBookingManagement() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const user = auth.currentUser;

  // Debug log để xác nhận code mới đã được nạp
  useEffect(() => {
    console.log("📢 COMPONENT MOUNTED - PHIÊN BẢN ĐÃ FIX LỖI 60 DISJUNCTIONS");
  }, []);

  // --- LOGIC MỚI: FETCH ONE-TIME & CHUNKING ---
  const fetchBookings = async () => {
    if (!user) return;
    if (!refreshing) setLoading(true);

    try {
      console.log("🚀 Bắt đầu quy trình tải Booking...");

      // 1. Lấy danh sách Toilet của Provider
      // Bước này quan trọng để lọc booking theo toilet của chính provider đó
      const qToilets = query(
        collection(db, "toilets"),
        where("createdBy", "==", user.email)
      );

      const toiletSnap = await getDocs(qToilets);
      const toiletIds: string[] = [];
      toiletSnap.forEach((doc) => toiletIds.push(doc.id));

      console.log(`✅ Tìm thấy ${toiletIds.length} nhà vệ sinh của bạn.`);

      // Nếu không có toilet nào thì chắc chắn không có booking
      if (toiletIds.length === 0) {
        setBookings([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // 2. KỸ THUẬT CHUNKING (CHIA NHỎ)
      // Firebase giới hạn toán tử 'in' tối đa 10 (đến 30) phần tử.
      // Nếu có 60 toilet, ta phải chia thành 6 mảng con, mỗi mảng 10 ID.
      const chunks = [];
      const CHUNK_SIZE = 10; // Giữ ở mức 10 cho an toàn tuyệt đối
      for (let i = 0; i < toiletIds.length; i += CHUNK_SIZE) {
        chunks.push(toiletIds.slice(i, i + CHUNK_SIZE));
      }

      console.log(
        `📦 Đã chia ${toiletIds.length} IDs thành ${chunks.length} gói request nhỏ.`
      );

      // 3. Chạy song song các query nhỏ (Parallel Execution)
      const promises = chunks.map((chunkIds, index) => {
        // Log để kiểm tra từng gói
        // console.log(`   - Gói ${index + 1}: Check ${chunkIds.length} toilets`);

        const q = query(
          collection(db, "bookings"),
          where("toiletId", "in", chunkIds)
        );
        return getDocs(q);
      });

      const snapshots = await Promise.all(promises);

      // 4. Gộp kết quả từ các gói lại
      const list: Booking[] = [];
      const activeStatuses = ["pending", "confirmed", "checked_in"];
      const historyStatuses = ["completed", "cancelled", "expired"];

      snapshots.forEach((snapshot) => {
        snapshot.forEach((doc) => {
          const data = doc.data();
          const status = data.status;

          // Lọc Client-side theo Tab (Active hoặc History)
          let isValid = false;
          if (activeTab === "active") {
            if (activeStatuses.includes(status)) isValid = true;
          } else {
            if (historyStatuses.includes(status)) isValid = true;
          }

          if (isValid) {
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
              bookingTime: data.bookingTime,
              toiletId: data.toiletId,
              toiletName: data.toiletName,
            });
          }
        });
      });

      // Sắp xếp: Mới nhất lên đầu
      list.sort(
        (a, b) =>
          new Date(b.bookingTime).getTime() - new Date(a.bookingTime).getTime()
      );

      console.log(`🎉 Tải xong! Tổng cộng ${list.length} booking.`);
      setBookings(list);
    } catch (error: any) {
      console.error("❌ Lỗi Fetch Data:", error);
      // Tiêu đề Alert này giúp Bình nhận biết code mới đã chạy
      Alert.alert(
        "Lỗi (Code Mới)",
        "Chi tiết: " + (error.message || "Không xác định")
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [user, activeTab]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings();
  }, [activeTab]);

  // --- CÁC HÀM XỬ LÝ ACTION (GIỮ NGUYÊN) ---

  const handleCallCustomer = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleCancelBooking = async (bookingId: string, roomId: string) => {
    Alert.alert("Hủy đặt chỗ", "Bạn có chắc muốn hủy đặt chỗ này?", [
      { text: "Không", style: "cancel" },
      {
        text: "Hủy booking",
        style: "destructive",
        onPress: async () => {
          try {
            await updateDoc(doc(db, "bookings", bookingId), {
              status: "cancelled",
              updatedAt: new Date().toISOString(),
            });
            Alert.alert("Thành công", "Đã hủy booking");
            fetchBookings();
          } catch (error: any) {
            Alert.alert("Lỗi", error.message);
          }
        },
      },
    ]);
  };

  const handleCheckIn = async (bookingId: string) => {
    Alert.alert("Check-in", "Khách đã đến nơi?", [
      { text: "Chưa", style: "cancel" },
      {
        text: "Xác nhận",
        onPress: async () => {
          try {
            await updateDoc(doc(db, "bookings", bookingId), {
              status: "checked_in",
              checkInTime: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            Alert.alert("Thành công", "Khách đã check-in");
            fetchBookings();
          } catch (e: any) {
            Alert.alert("Lỗi", e.message);
          }
        },
      },
    ]);
  };

  const handleCheckOut = async (bookingId: string) => {
    Alert.alert("Check-out", "Hoàn tất đơn hàng và nhận thanh toán?", [
      { text: "Chưa", style: "cancel" },
      {
        text: "Hoàn tất",
        onPress: async () => {
          try {
            await updateDoc(doc(db, "bookings", bookingId), {
              status: "completed",
              checkOutTime: new Date().toISOString(),
              paymentStatus: "paid",
              updatedAt: new Date().toISOString(),
            });
            Alert.alert("Thành công", "Đơn hàng hoàn tất");
            fetchBookings();
          } catch (e: any) {
            Alert.alert("Lỗi", e.message);
          }
        },
      },
    ]);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "#FF9800",
      confirmed: "#2196F3",
      checked_in: "#4CAF50",
      completed: "#9E9E9E",
      cancelled: "#F44336",
      expired: "#607D8B",
    };
    return colors[status] || "#999";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Chờ xác nhận",
      confirmed: "Đã giữ chỗ",
      checked_in: "Đang sử dụng",
      completed: "Hoàn thành",
      cancelled: "Đã hủy",
      expired: "Hết hạn",
    };
    return labels[status] || status;
  };

  const renderBookingItem = ({ item }: { item: Booking }) => (
    <TouchableOpacity
      style={styles.bookingCard}
      onPress={() => {
        setSelectedBooking(item);
        setDetailModalVisible(true);
      }}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.roomNumber}>{item.toiletName}</Text>
          <Text style={styles.customerName}>
            {item.userName} - {item.roomNumber}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
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
            Booking:{" "}
            {new Date(item.bookingTime).toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>

      {["pending", "confirmed", "checked_in"].includes(item.status) && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            onPress={() => handleCallCustomer(item.userPhone)}
            style={[styles.miniBtn, { backgroundColor: "#E0F7FA" }]}
          >
            <Ionicons name="call" size={16} color="#006064" />
          </TouchableOpacity>

          {item.status === "pending" && (
            <TouchableOpacity
              onPress={() => handleCheckIn(item.id)}
              style={[styles.miniBtn, { backgroundColor: "#E8F5E9" }]}
            >
              <Ionicons name="log-in" size={16} color="#2E7D32" />
            </TouchableOpacity>
          )}

          {item.status === "checked_in" && (
            <TouchableOpacity
              onPress={() => handleCheckOut(item.id)}
              style={[styles.miniBtn, { backgroundColor: "#FFF3E0" }]}
            >
              <Ionicons name="checkmark-done" size={16} color="#EF6C00" />
            </TouchableOpacity>
          )}

          {item.status === "pending" && (
            <TouchableOpacity
              onPress={() => handleCancelBooking(item.id, item.roomNumber)}
              style={[styles.miniBtn, { backgroundColor: "#FFEBEE" }]}
            >
              <Ionicons name="close" size={16} color="#C62828" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý đặt chỗ</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {bookings.filter((b) => b.status === "pending").length}
            </Text>
            <Text style={styles.statLabel}>Chờ khách</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {bookings.filter((b) => b.status === "checked_in").length}
            </Text>
            <Text style={styles.statLabel}>Đang dùng</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "active" && styles.activeTab]}
          onPress={() => setActiveTab("active")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "active" && styles.activeTabText,
            ]}
          >
            Đang hoạt động
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "history" && styles.activeTab]}
          onPress={() => setActiveTab("history")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "history" && styles.activeTabText,
            ]}
          >
            Lịch sử
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#2196F3"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={bookings}
          renderItem={renderBookingItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#2196F3"]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                {activeTab === "active"
                  ? "Chưa có khách đặt"
                  : "Chưa có lịch sử"}
              </Text>
              <Text style={{ fontSize: 12, color: "#999", marginTop: 5 }}>
                Kéo xuống để tải lại
              </Text>
            </View>
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
              <Text style={styles.modalTitle}>Chi tiết Booking</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedBooking && (
              <View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Khách:</Text>
                  <Text style={styles.detailValue}>
                    {selectedBooking.userName}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>SĐT:</Text>
                  <Text style={styles.detailValue}>
                    {selectedBooking.userPhone}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Địa điểm:</Text>
                  <Text style={styles.detailValue}>
                    {selectedBooking.toiletName}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tổng tiền:</Text>
                  <Text style={styles.detailValue}>
                    {selectedBooking.totalPrice?.toLocaleString()}đ
                  </Text>
                </View>

                {selectedBooking.notes && (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>Ghi chú của khách:</Text>
                    <Text style={styles.notesText}>
                      {selectedBooking.notes}
                    </Text>
                  </View>
                )}

                <View style={styles.qrBox}>
                  <Text style={styles.qrLabel}>Mã Vé:</Text>
                  <Text style={styles.qrCode}>
                    {selectedBooking.id.slice(0, 8).toUpperCase()}
                  </Text>
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
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: {
    backgroundColor: "#2196F3",
    padding: 20,
    paddingTop: 60,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 15,
  },
  statsRow: { flexDirection: "row", gap: 10 },
  statBox: {
    flex: 1,
    backgroundColor: "white",
    padding: 10,
    borderRadius: 12,
    alignItems: "center",
    elevation: 2,
  },
  statNumber: { fontSize: 20, fontWeight: "bold", color: "#FF5722" },
  statLabel: { fontSize: 12, color: "#666", marginTop: 2 },
  tabs: {
    flexDirection: "row",
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    elevation: 1,
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 15 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: "#2196F3" },
  tabText: { fontWeight: "500", color: "#666" },
  activeTabText: { color: "#2196F3", fontWeight: "bold" },
  listContainer: { padding: 15 },
  bookingCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: "#2196F3",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  roomNumber: { fontSize: 16, fontWeight: "bold", color: "#333" },
  customerName: { fontSize: 13, color: "#666", marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, color: "white", fontWeight: "bold" },
  cardBody: { marginBottom: 10 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
    gap: 8,
  },
  infoText: { fontSize: 13, color: "#555" },

  actionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 5,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 10,
  },
  miniBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyContainer: { alignItems: "center", marginTop: 50 },
  emptyText: { textAlign: "center", color: "#999", marginTop: 10 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#333" },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  detailLabel: { fontSize: 14, color: "#666" },
  detailValue: { fontSize: 14, fontWeight: "bold", color: "#333" },
  notesBox: {
    backgroundColor: "#FFFDE7",
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
  },
  notesLabel: {
    fontSize: 12,
    color: "#FBC02D",
    marginBottom: 5,
    fontWeight: "bold",
  },
  notesText: { fontSize: 14, color: "#333", fontStyle: "italic" },
  qrBox: {
    backgroundColor: "#E3F2FD",
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    alignItems: "center",
  },
  qrLabel: { fontSize: 12, color: "#1976D2", marginBottom: 5 },
  qrCode: {
    fontSize: 18,
    color: "#1565C0",
    fontFamily: "monospace",
    fontWeight: "bold",
    letterSpacing: 2,
  },
});
