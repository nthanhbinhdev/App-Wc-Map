// components/ui/ProviderBookingManagement.tsx - PHIÊN BẢN HOÀN THIỆN
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
  TextInput,
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
  checkInTime?: string;
  checkOutTime?: string;
}

export default function ProviderBookingManagement() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const user = auth.currentUser;

  useEffect(() => {
    fetchBookings();
  }, [user, activeTab]);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, filterStatus, bookings]);

  const fetchBookings = async () => {
    if (!user) return;
    if (!refreshing) setLoading(true);

    try {
      // 1. Lấy danh sách Toilet của Provider
      const qToilets = query(
        collection(db, "toilets"),
        where("createdBy", "==", user.email)
      );

      const toiletSnap = await getDocs(qToilets);
      const toiletIds: string[] = [];
      toiletSnap.forEach((doc) => toiletIds.push(doc.id));

      if (toiletIds.length === 0) {
        setBookings([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // 2. Chunking để tránh lỗi 60 disjunctions
      const chunks = [];
      const CHUNK_SIZE = 10;
      for (let i = 0; i < toiletIds.length; i += CHUNK_SIZE) {
        chunks.push(toiletIds.slice(i, i + CHUNK_SIZE));
      }

      // 3. Fetch bookings từ từng chunk
      const promises = chunks.map((chunkIds) => {
        const q = query(
          collection(db, "bookings"),
          where("toiletId", "in", chunkIds)
        );
        return getDocs(q);
      });

      const snapshots = await Promise.all(promises);

      // 4. Gộp kết quả
      const list: Booking[] = [];
      const activeStatuses = ["pending", "confirmed", "checked_in"];
      const historyStatuses = ["completed", "cancelled", "expired"];

      snapshots.forEach((snapshot) => {
        snapshot.forEach((doc) => {
          const data = doc.data();
          const status = data.status;

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
              checkInTime: data.checkInTime,
              checkOutTime: data.checkOutTime,
            });
          }
        });
      });

      // Sắp xếp: Mới nhất lên đầu
      list.sort(
        (a, b) =>
          new Date(b.bookingTime).getTime() - new Date(a.bookingTime).getTime()
      );

      setBookings(list);
    } catch (error: any) {
      console.error("❌ Lỗi Fetch Data:", error);
      Alert.alert("Lỗi", error.message || "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...bookings];

    // Filter by status
    if (filterStatus !== "all") {
      filtered = filtered.filter((b) => b.status === filterStatus);
    }

    // Search by name or phone
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.userName.toLowerCase().includes(query) ||
          b.userPhone.includes(query) ||
          b.toiletName.toLowerCase().includes(query)
      );
    }

    setFilteredBookings(filtered);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings();
  }, [activeTab]);

  // Actions
  const handleCallCustomer = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleCancelBooking = async (bookingId: string, roomId: string) => {
    Alert.alert("Hủy đặt chỗ", "Bạn có chắc muốn hủy đặt chỗ này?", [
      { text: "Không", style: "cancel" },
      {
        text: "Xác nhận hủy",
        style: "destructive",
        onPress: async () => {
          try {
            await updateDoc(doc(db, "bookings", bookingId), {
              status: "cancelled",
              updatedAt: new Date().toISOString(),
            });

            // Giải phóng phòng nếu có
            if (roomId && roomId !== "general") {
              await updateDoc(doc(db, "rooms", roomId), {
                status: "available",
                currentBookingId: null,
                lastUpdated: new Date().toISOString(),
              });
            }

            Alert.alert("✅ Thành công", "Đã hủy booking");
            fetchBookings();
          } catch (error: any) {
            Alert.alert("❌ Lỗi", error.message);
          }
        },
      },
    ]);
  };

  const handleCheckIn = async (bookingId: string) => {
    Alert.alert("Check-in", "Xác nhận khách đã đến?", [
      { text: "Chưa", style: "cancel" },
      {
        text: "Đã đến",
        onPress: async () => {
          try {
            await updateDoc(doc(db, "bookings", bookingId), {
              status: "checked_in",
              checkInTime: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            Alert.alert("✅ Check-in thành công");
            fetchBookings();
          } catch (e: any) {
            Alert.alert("❌ Lỗi", e.message);
          }
        },
      },
    ]);
  };

  const handleCheckOut = async (bookingId: string, roomId: string) => {
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

            // Giải phóng phòng
            if (roomId && roomId !== "general") {
              await updateDoc(doc(db, "rooms", roomId), {
                status: "available",
                currentBookingId: null,
                lastUpdated: new Date().toISOString(),
              });
            }

            Alert.alert("✅ Hoàn tất", "Đơn hàng đã hoàn thành");
            fetchBookings();
          } catch (e: any) {
            Alert.alert("❌ Lỗi", e.message);
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
      confirmed: "Đã xác nhận",
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
        <View style={{ flex: 1 }}>
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
            {new Date(item.bookingTime).toLocaleString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="cash" size={14} color="#666" />
          <Text style={styles.infoText}>
            {item.totalPrice.toLocaleString()}đ
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
            <>
              <TouchableOpacity
                onPress={() => handleCheckIn(item.id)}
                style={[styles.miniBtn, { backgroundColor: "#E8F5E9" }]}
              >
                <Ionicons name="log-in" size={16} color="#2E7D32" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleCancelBooking(item.id, item.roomNumber)}
                style={[styles.miniBtn, { backgroundColor: "#FFEBEE" }]}
              >
                <Ionicons name="close" size={16} color="#C62828" />
              </TouchableOpacity>
            </>
          )}

          {item.status === "checked_in" && (
            <TouchableOpacity
              onPress={() => handleCheckOut(item.id, item.roomNumber)}
              style={[styles.miniBtn, { backgroundColor: "#FFF3E0" }]}
            >
              <Ionicons name="checkmark-done" size={16} color="#EF6C00" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  const StatusFilterChip = ({
    status,
    label,
  }: {
    status: string;
    label: string;
  }) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        filterStatus === status && styles.filterChipActive,
      ]}
      onPress={() => setFilterStatus(status)}
    >
      <Text
        style={[
          styles.filterChipText,
          filterStatus === status && styles.filterChipTextActive,
        ]}
      >
        {label}
      </Text>
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
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{bookings.length}</Text>
            <Text style={styles.statLabel}>Tổng</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "active" && styles.activeTab]}
          onPress={() => setActiveTab("active")}
        >
          <Ionicons
            name="time"
            size={18}
            color={activeTab === "active" ? "#2196F3" : "#666"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "active" && styles.activeTabText,
            ]}
          >
            Đang hoạt động (
            {
              bookings.filter((b) =>
                ["pending", "confirmed", "checked_in"].includes(b.status)
              ).length
            }
            )
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "history" && styles.activeTab]}
          onPress={() => setActiveTab("history")}
        >
          <Ionicons
            name="archive"
            size={18}
            color={activeTab === "history" ? "#2196F3" : "#666"}
          />
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

      {/* Search & Filters */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo tên, SĐT, địa điểm..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {activeTab === "active" && (
          <View style={styles.filterRow}>
            <StatusFilterChip status="all" label="Tất cả" />
            <StatusFilterChip status="pending" label="Chờ" />
            <StatusFilterChip status="confirmed" label="Đã xác nhận" />
            <StatusFilterChip status="checked_in" label="Đang dùng" />
          </View>
        )}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
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
              <Ionicons name="calendar-outline" size={64} color="#E0E0E0" />
              <Text style={styles.emptyText}>
                {searchQuery
                  ? "Không tìm thấy kết quả"
                  : activeTab === "active"
                  ? "Chưa có khách đặt"
                  : "Chưa có lịch sử"}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery
                  ? "Thử tìm kiếm với từ khóa khác"
                  : "Kéo xuống để làm mới"}
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
              <View style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Khách hàng:</Text>
                  <Text style={styles.detailValue}>
                    {selectedBooking.userName}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Số điện thoại:</Text>
                  <TouchableOpacity
                    onPress={() =>
                      handleCallCustomer(selectedBooking.userPhone)
                    }
                  >
                    <Text style={[styles.detailValue, { color: "#2196F3" }]}>
                      {selectedBooking.userPhone}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Địa điểm:</Text>
                  <Text style={styles.detailValue}>
                    {selectedBooking.toiletName}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phòng:</Text>
                  <Text style={styles.detailValue}>
                    {selectedBooking.roomNumber}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tổng tiền:</Text>
                  <Text
                    style={[
                      styles.detailValue,
                      { color: "#4CAF50", fontWeight: "bold" },
                    ]}
                  >
                    {selectedBooking.totalPrice?.toLocaleString()}đ
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Thời gian đặt:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedBooking.bookingTime).toLocaleString(
                      "vi-VN"
                    )}
                  </Text>
                </View>

                {selectedBooking.checkInTime && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Check-in:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedBooking.checkInTime).toLocaleString(
                        "vi-VN"
                      )}
                    </Text>
                  </View>
                )}

                {selectedBooking.checkOutTime && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Check-out:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedBooking.checkOutTime).toLocaleString(
                        "vi-VN"
                      )}
                    </Text>
                  </View>
                )}

                {selectedBooking.notes && (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>Ghi chú của khách:</Text>
                    <Text style={styles.notesText}>
                      {selectedBooking.notes}
                    </Text>
                  </View>
                )}

                <View style={styles.qrBox}>
                  <Text style={styles.qrLabel}>Mã Booking:</Text>
                  <Text style={styles.qrCode}>
                    #{selectedBooking.id.slice(0, 8).toUpperCase()}
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

  // Header
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
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  statNumber: { fontSize: 24, fontWeight: "bold", color: "#FF5722" },
  statLabel: { fontSize: 11, color: "#666", marginTop: 4 },

  // Tabs
  tabs: {
    flexDirection: "row",
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    gap: 6,
  },
  activeTab: { borderBottomWidth: 3, borderBottomColor: "#2196F3" },
  tabText: { fontWeight: "500", color: "#666", fontSize: 13 },
  activeTabText: { color: "#2196F3", fontWeight: "bold" },

  // Search & Filter
  searchSection: {
    backgroundColor: "white",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 45,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  filterChipActive: {
    backgroundColor: "#2196F3",
    borderColor: "#2196F3",
  },
  filterChipText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "white",
    fontWeight: "bold",
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },

  // List
  listContainer: { padding: 15, paddingBottom: 30 },
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
    marginBottom: 12,
  },
  roomNumber: { fontSize: 15, fontWeight: "bold", color: "#333" },
  customerName: { fontSize: 13, color: "#666", marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusText: { fontSize: 10, color: "white", fontWeight: "bold" },
  cardBody: { marginBottom: 12 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  infoText: { fontSize: 13, color: "#555" },

  actionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  miniBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    elevation: 1,
  },

  // Empty
  emptyContainer: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 15,
  },
  emptySubtext: {
    textAlign: "center",
    color: "#999",
    fontSize: 13,
    marginTop: 8,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#333" },
  modalBody: {},
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  detailLabel: { fontSize: 14, color: "#666", flex: 1 },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    textAlign: "right",
  },
  notesBox: {
    backgroundColor: "#FFFDE7",
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
  },
  notesLabel: {
    fontSize: 12,
    color: "#F57F17",
    marginBottom: 5,
    fontWeight: "bold",
  },
  notesText: { fontSize: 14, color: "#333" },
  qrBox: {
    backgroundColor: "#E3F2FD",
    padding: 15,
    borderRadius: 12,
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
