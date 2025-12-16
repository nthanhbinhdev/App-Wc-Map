// components/ui/RoomManagement.tsx
import { Ionicons } from "@expo/vector-icons";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../firebaseConfig";

interface Room {
  id: string;
  toiletId: string;
  toiletName: string;
  roomNumber: string;
  type: "single" | "couple" | "family";
  status: "available" | "booked" | "occupied" | "maintenance";
  price: number;
  amenities: string[];
  createdAt: string;
  lastUpdated: string;
}

interface Toilet {
  id: string;
  name: string;
}

interface RoomManagementProps {
  onClose: () => void;
  initialToiletId?: string | null;
}

export default function RoomManagement({
  onClose,
  initialToiletId,
}: RoomManagementProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myToilets, setMyToilets] = useState<Toilet[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);

  // Filter states
  const [selectedToiletId, setSelectedToiletId] = useState<string>(
    initialToiletId || "all"
  );
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Modal states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);

  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    toiletId: "",
    roomNumber: "",
    type: "single" as "single" | "couple" | "family",
    price: "",
    status: "available" as "available" | "booked" | "occupied" | "maintenance",
  });

  const user = auth.currentUser;

  const ROOM_TYPES = [
    { value: "single", label: "🚿 Đơn", color: "#2196F3" },
    { value: "couple", label: "💑 Đôi", color: "#9C27B0" },
    { value: "family", label: "👨‍👩‍👧 Gia đình", color: "#FF9800" },
  ];

  const ROOM_STATUS = [
    {
      value: "available",
      label: "Trống",
      color: "#4CAF50",
      bgColor: "#E8F5E9",
      icon: "checkmark-circle",
    },
    {
      value: "booked",
      label: "Đã đặt",
      color: "#FF9800",
      bgColor: "#FFF3E0",
      icon: "time",
    },
    {
      value: "occupied",
      label: "Đang dùng",
      color: "#F44336",
      bgColor: "#FFEBEE",
      icon: "person",
    },
    {
      value: "maintenance",
      label: "Bảo trì",
      color: "#9E9E9E",
      bgColor: "#F5F5F5",
      icon: "construct",
    },
  ];

  useEffect(() => {
    if (initialToiletId) {
      setSelectedToiletId(initialToiletId);
    } else {
      setSelectedToiletId("all");
    }
  }, [initialToiletId]);

  useEffect(() => {
    fetchData();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [selectedToiletId, selectedStatus, rooms]);

  const fetchData = async () => {
    if (!user) return;
    if (!refreshing) setLoading(true);

    try {
      const qToilets = query(
        collection(db, "toilets"),
        where("createdBy", "==", user.email)
      );
      const toiletsSnap = await getDocs(qToilets);
      const toiletsList: Toilet[] = [];
      const toiletIds: string[] = [];

      toiletsSnap.forEach((doc) => {
        const data = doc.data();
        toiletsList.push({ id: doc.id, name: data.name });
        toiletIds.push(doc.id);
      });

      setMyToilets(toiletsList);

      if (toiletIds.length === 0) {
        setRooms([]);
        setFilteredRooms([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const chunks = [];
      const CHUNK_SIZE = 10;
      for (let i = 0; i < toiletIds.length; i += CHUNK_SIZE) {
        chunks.push(toiletIds.slice(i, i + CHUNK_SIZE));
      }

      const roomsList: Room[] = [];
      for (const chunk of chunks) {
        const qRooms = query(
          collection(db, "rooms"),
          where("toiletId", "in", chunk)
        );
        const roomsSnap = await getDocs(qRooms);
        roomsSnap.forEach((doc) => {
          roomsList.push({ id: doc.id, ...doc.data() } as Room);
        });
      }

      roomsList.sort((a, b) => {
        if (a.toiletName !== b.toiletName) {
          return a.toiletName.localeCompare(b.toiletName);
        }
        return a.roomNumber.localeCompare(b.roomNumber);
      });

      setRooms(roomsList);
    } catch (error) {
      console.error("Lỗi fetch data:", error);
      Alert.alert("Lỗi", "Không thể tải dữ liệu phòng");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...rooms];
    if (selectedToiletId !== "all") {
      filtered = filtered.filter((r) => r.toiletId === selectedToiletId);
    }
    if (selectedStatus !== "all") {
      filtered = filtered.filter((r) => r.status === selectedStatus);
    }
    setFilteredRooms(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // CRUD Operations
  const handleAddRoom = async () => {
    if (!formData.toiletId || !formData.roomNumber || !formData.price) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin!");
      return;
    }
    const duplicate = rooms.find(
      (r) =>
        r.toiletId === formData.toiletId && r.roomNumber === formData.roomNumber
    );
    if (duplicate) {
      Alert.alert("Lỗi", `Phòng ${formData.roomNumber} đã tồn tại!`);
      return;
    }
    try {
      const toiletName =
        myToilets.find((t) => t.id === formData.toiletId)?.name || "";
      const roomData = {
        toiletId: formData.toiletId,
        toiletName,
        roomNumber: formData.roomNumber,
        type: formData.type,
        status: formData.status,
        price: Number(formData.price),
        amenities: ["hot_water", "towel", "soap"],
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };
      await addDoc(collection(db, "rooms"), roomData);
      Alert.alert("✅ Thành công", "Đã thêm phòng mới!");
      setAddModalVisible(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      Alert.alert("❌ Lỗi", error.message);
    }
  };

  const handleEditRoom = async () => {
    if (!selectedRoom || !formData.roomNumber || !formData.price) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin!");
      return;
    }
    try {
      const roomRef = doc(db, "rooms", selectedRoom.id);
      await updateDoc(roomRef, {
        roomNumber: formData.roomNumber,
        type: formData.type,
        price: Number(formData.price),
        status: formData.status,
        lastUpdated: new Date().toISOString(),
      });
      Alert.alert("✅ Thành công", "Đã cập nhật phòng!");
      setEditModalVisible(false);
      setSelectedRoom(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      Alert.alert("❌ Lỗi", error.message);
    }
  };

  const handleDeleteRoom = (room: Room) => {
    if (room.status === "occupied" || room.status === "booked") {
      Alert.alert("⚠️ Không thể xóa", "Phòng đang có khách hoặc booking.");
      return;
    }
    Alert.alert("⚠️ Xác nhận xóa", `Xóa phòng ${room.roomNumber}?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "rooms", room.id));
            Alert.alert("✅ Đã xóa", "Phòng đã được xóa khỏi hệ thống");
            fetchData();
          } catch (error: any) {
            Alert.alert("❌ Lỗi", error.message);
          }
        },
      },
    ]);
  };

  const handleQuickStatusChange = async (room: Room, newStatus: string) => {
    try {
      const roomRef = doc(db, "rooms", room.id);
      await updateDoc(roomRef, {
        status: newStatus,
        lastUpdated: new Date().toISOString(),
      });
      setRooms((prev) =>
        prev.map((r) =>
          r.id === room.id ? { ...r, status: newStatus as Room["status"] } : r
        )
      );
      setStatusModalVisible(false);
    } catch (error: any) {
      Alert.alert("❌ Lỗi", error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      toiletId: "",
      roomNumber: "",
      type: "single",
      price: "",
      status: "available",
    });
  };

  const openEditModal = (room: Room) => {
    setSelectedRoom(room);
    setFormData({
      toiletId: room.toiletId,
      roomNumber: room.roomNumber,
      type: room.type,
      price: String(room.price),
      status: room.status,
    });
    setEditModalVisible(true);
  };

  const openStatusModal = (room: Room) => {
    setSelectedRoom(room);
    setStatusModalVisible(true);
  };

  // ==================== RENDER FUNCTIONS ====================

  const renderRoomItem = ({ item }: { item: Room }) => {
    const roomType = ROOM_TYPES.find((t) => t.value === item.type);
    const roomStatus = ROOM_STATUS.find((s) => s.value === item.status);

    return (
      <View
        style={[
          styles.roomCard,
          { borderLeftColor: roomStatus?.color || "#999" },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => openStatusModal(item)}
          style={{ flex: 1 }}
        >
          <View style={styles.roomCardHeader}>
            <View style={styles.roomNumberContainer}>
              <Text style={styles.roomNumber}>P.{item.roomNumber}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: roomStatus?.bgColor || "#F5F5F5" },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: roomStatus?.color || "#666" },
                ]}
              >
                {roomStatus?.label}
              </Text>
            </View>
          </View>

          <View style={styles.roomCardBody}>
            <Text
              style={styles.toiletName}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              📍 {item.toiletName}
            </Text>
            <Text
              style={[styles.roomPrice, { color: roomType?.color }]}
              numberOfLines={1}
            >
              {roomType?.label} • {item.price.toLocaleString()}đ
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.divider} />

        <View style={styles.roomCardActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openEditModal(item)}
          >
            <Ionicons name="create-outline" size={18} color="#666" />
            <Text style={styles.actionButtonText}>Sửa</Text>
          </TouchableOpacity>
          <View style={styles.verticalDivider} />
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteRoom(item)}
          >
            <Ionicons name="trash-outline" size={18} color="#F44336" />
            <Text style={[styles.actionButtonText, { color: "#F44336" }]}>
              Xóa
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderRoomForm = (isEdit: boolean = false) => (
    <View style={styles.formContainer}>
      {!isEdit && (
        <>
          <Text style={styles.modalLabel}>Địa điểm</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pickerContainer}
          >
            {myToilets.map((toilet) => (
              <TouchableOpacity
                key={toilet.id}
                style={[
                  styles.pickerItem,
                  formData.toiletId === toilet.id && styles.pickerItemActive,
                ]}
                onPress={() =>
                  setFormData({ ...formData, toiletId: toilet.id })
                }
              >
                <Text
                  style={[
                    styles.pickerItemText,
                    formData.toiletId === toilet.id &&
                      styles.pickerItemTextActive,
                  ]}
                >
                  {toilet.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.modalLabel}>Số phòng</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="VD: 101"
            value={formData.roomNumber}
            onChangeText={(text) =>
              setFormData({ ...formData, roomNumber: text })
            }
          />
        </View>
        <View style={styles.col}>
          <Text style={styles.modalLabel}>Giá (VNĐ)</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="50000"
            keyboardType="numeric"
            value={formData.price}
            onChangeText={(text) => setFormData({ ...formData, price: text })}
          />
        </View>
      </View>

      <Text style={styles.modalLabel}>Loại phòng</Text>
      <View style={styles.typeSelector}>
        {ROOM_TYPES.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.typeBtn,
              formData.type === type.value && {
                backgroundColor: type.color + "15", // Opacity 15%
                borderColor: type.color,
                borderWidth: 2,
              },
            ]}
            onPress={() =>
              setFormData({
                ...formData,
                type: type.value as "single" | "couple" | "family",
              })
            }
          >
            <Text
              style={[
                styles.typeBtnText,
                formData.type === type.value && {
                  color: type.color,
                  fontWeight: "bold",
                },
              ]}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Ionicons name="arrow-down" size={28} color="#333" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Quản lý Phòng</Text>
          <Text style={styles.headerSubtitle}>
            {filteredRooms.length} phòng hiển thị
          </Text>
        </View>
        <TouchableOpacity
          style={styles.headerAddBtn}
          onPress={() => {
            if (myToilets.length === 0) {
              Alert.alert("Thông báo", "Vui lòng tạo địa điểm trước!");
              return;
            }
            resetForm();
            const defaultToiletId =
              selectedToiletId !== "all" ? selectedToiletId : myToilets[0].id;
            setFormData({ ...formData, toiletId: defaultToiletId });
            setAddModalVisible(true);
          }}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* FILTERS */}
      <View style={styles.filtersSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedToiletId === "all" && styles.filterChipActive,
            ]}
            onPress={() => setSelectedToiletId("all")}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedToiletId === "all" && styles.filterChipTextActive,
              ]}
            >
              Tất cả
            </Text>
          </TouchableOpacity>
          {myToilets.map((toilet) => (
            <TouchableOpacity
              key={toilet.id}
              style={[
                styles.filterChip,
                selectedToiletId === toilet.id && styles.filterChipActive,
              ]}
              onPress={() => setSelectedToiletId(toilet.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedToiletId === toilet.id && styles.filterChipTextActive,
                ]}
              >
                {toilet.name}
              </Text>
            </TouchableOpacity>
          ))}

          <View style={styles.filterSeparator} />

          {ROOM_STATUS.map((status) => (
            <TouchableOpacity
              key={status.value}
              style={[
                styles.filterChip,
                selectedStatus === status.value && {
                  backgroundColor: status.color,
                  borderColor: status.color,
                },
              ]}
              onPress={() => setSelectedStatus(status.value)}
            >
              <Ionicons
                name={status.icon as any}
                size={14}
                color={
                  selectedStatus === status.value ? "white" : status.color
                }
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.filterChipText,
                  selectedStatus === status.value && styles.filterChipTextActive,
                  {
                    color:
                      selectedStatus === status.value ? "white" : status.color,
                  },
                ]}
              >
                {status.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ROOM LIST */}
      <FlatList
        data={filteredRooms}
        renderItem={renderRoomItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2196F3"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bed-outline" size={64} color="#E0E0E0" />
            <Text style={styles.emptyText}>Chưa có phòng nào</Text>
            <Text style={styles.emptySubtext}>
              Nhấn nút + để thêm phòng mới
            </Text>
          </View>
        }
      />

      {/* ADD/EDIT MODAL */}
      <Modal
        visible={addModalVisible || editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setAddModalVisible(false);
          setEditModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {addModalVisible ? "Thêm Phòng Mới" : "Cập Nhật Phòng"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setAddModalVisible(false);
                  setEditModalVisible(false);
                }}
              >
                <Ionicons name="close-circle" size={30} color="#E0E0E0" />
              </TouchableOpacity>
            </View>

            {renderRoomForm(editModalVisible)}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setAddModalVisible(false);
                  setEditModalVisible(false);
                }}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={addModalVisible ? handleAddRoom : handleEditRoom}
              >
                <Text style={styles.modalConfirmText}>
                  {addModalVisible ? "Thêm Ngay" : "Lưu Thay Đổi"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* STATUS MODAL */}
      <Modal
        visible={statusModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.statusModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Trạng thái P.{selectedRoom?.roomNumber}
              </Text>
              <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.statusOptionsContainer}>
              {ROOM_STATUS.map((status) => (
                <TouchableOpacity
                  key={status.value}
                  style={[
                    styles.statusOptionBtn,
                    selectedRoom?.status === status.value &&
                      styles.statusOptionBtnActive,
                    { borderColor: status.color },
                  ]}
                  onPress={() =>
                    selectedRoom &&
                    handleQuickStatusChange(selectedRoom, status.value)
                  }
                >
                  <View
                    style={[
                      styles.statusIconCircle,
                      { backgroundColor: status.color },
                    ]}
                  >
                    <Ionicons
                      name={status.icon as any}
                      size={24}
                      color="white"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statusOptionTitle}>{status.label}</Text>
                    <Text style={styles.statusDescription}>
                      {status.value === "available"
                        ? "Sẵn sàng đón khách"
                        : status.value === "occupied"
                        ? "Khách đang sử dụng"
                        : status.value === "booked"
                        ? "Đã được đặt trước"
                        : "Đang sửa chữa / dọn dẹp"}
                    </Text>
                  </View>
                  {selectedRoom?.status === status.value && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={status.color}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9FC" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { marginTop: 12, color: "#666", fontSize: 14, fontWeight: "500" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "white",
    // Modern shadow instead of border
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F7FA",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1A1A1A",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#888",
    marginTop: 4,
    fontWeight: "500",
  },
  headerAddBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#2196F3",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2196F3",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  // Filters
  filtersSection: {
    paddingVertical: 16,
    backgroundColor: "transparent", // Let background show through
  },
  filterScroll: {
    paddingHorizontal: 24,
    gap: 12,
    alignItems: "center",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#EEF0F5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  filterChipActive: {
    backgroundColor: "#2196F3",
    borderColor: "#2196F3",
    shadowColor: "#2196F3",
    shadowOpacity: 0.2,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  filterChipTextActive: {
    color: "white",
  },
  filterSeparator: {
    width: 1,
    height: 24,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 4,
  },

  // List
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 8,
  },
  roomCard: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 20,
    borderLeftWidth: 6, // Thicker accent
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 8,
    overflow: "hidden", // Clean corners
  },
  roomCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingBottom: 8,
  },
  roomNumberContainer: {
    backgroundColor: "#F8F9FB",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  roomNumber: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2D3436",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  roomCardBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  toiletName: {
    fontSize: 12,
    color: "#999",
    marginBottom: 6,
    fontWeight: "500",
  },
  roomPrice: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginHorizontal: 16,
  },
  roomCardActions: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "#FAFBFC", // Subtle bg for actions
  },
  verticalDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#E0E0E0",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    marginTop: 80,
    opacity: 0.8,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2D3436",
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 15,
    color: "#888",
    marginTop: 8,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)", // Darker overlay
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  statusModalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    paddingBottom: 50,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#2D3436",
    letterSpacing: -0.5,
  },
  formContainer: {
    gap: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4A5568",
    marginBottom: 8,
    textTransform: 'uppercase', // Stylish label
    letterSpacing: 0.5,
  },
  pickerContainer: {
    gap: 10,
    marginBottom: 10,
  },
  pickerItem: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#F7FAFC",
    borderWidth: 1,
    borderColor: "#EDF2F7",
  },
  pickerItemActive: {
    backgroundColor: "#EBF8FF",
    borderColor: "#3182CE",
    borderWidth: 2, // Highlight active
  },
  pickerItemText: {
    fontSize: 14,
    color: "#718096",
    fontWeight: "600",
  },
  pickerItemTextActive: {
    color: "#2B6CB0",
    fontWeight: "800",
  },
  row: {
    flexDirection: "row",
    gap: 16,
  },
  col: {
    flex: 1,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#F8FAFC",
    color: "#2D3748",
  },
  typeSelector: {
    flexDirection: "row",
    gap: 12,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#718096",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 16,
    marginTop: 40,
  },
  modalCancelBtn: {
    flex: 1,
    padding: 18,
    borderRadius: 20,
    backgroundColor: "#EDF2F7",
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4A5568",
  },
  modalConfirmBtn: {
    flex: 2,
    padding: 18,
    borderRadius: 20,
    backgroundColor: "#3182CE",
    alignItems: "center",
    shadowColor: "#3182CE",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },

  // Status Modal specific
  statusOptionsContainer: {
    gap: 16,
  },
  statusOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EDF2F7",
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  statusOptionBtnActive: {
    backgroundColor: "#F7FAFC",
    borderWidth: 2,
    borderColor: "#3182CE", // Fallback if dynamic color fails
  },
  statusIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusOptionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#2D3748",
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 13,
    color: "#718096",
    lineHeight: 18,
  },
});