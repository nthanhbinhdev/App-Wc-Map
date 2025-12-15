import { Ionicons } from "@expo/vector-icons";
import {
  addDoc,
  collection,
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
  Modal,
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
  roomNumber: string;
  type: string;
  status: string;
  price: number;
}

interface BookingFormProps {
  visible: boolean;
  onClose: () => void;
  toilet: any;
}

export default function BookingForm({
  visible,
  onClose,
  toilet,
}: BookingFormProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // Form state
  const [userName, setUserName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("15");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const user = auth.currentUser;

  useEffect(() => {
    if (visible && toilet) {
      fetchRooms();
      setUserName(user?.displayName || "");
    }
  }, [visible, toilet]);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      // Tìm phòng available của toilet này
      const q = query(
        collection(db, "rooms"),
        where("toiletId", "==", toilet.id),
        where("status", "==", "available")
      );
      const snapshot = await getDocs(q);
      const roomList: Room[] = [];
      snapshot.forEach((doc) => {
        roomList.push({ id: doc.id, ...doc.data() } as Room);
      });
      setRooms(roomList);
    } catch (error) {
      console.error(error);
      // Không alert lỗi để tránh làm phiền user nếu chỉ là không có phòng
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBooking = async () => {
    // Validate cơ bản
    if (!userName.trim() || !userPhone.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ tên và số điện thoại");
      return;
    }

    // Nếu có danh sách phòng mà chưa chọn -> Bắt buộc chọn
    if (rooms.length > 0 && !selectedRoom) {
      Alert.alert("Lỗi", "Vui lòng chọn một phòng trống");
      return;
    }

    setSubmitting(true);

    try {
      const now = new Date();
      const eta = new Date(now.getTime() + parseInt(estimatedMinutes) * 60000);
      const expiry = new Date(now.getTime() + 20 * 60000); // Giữ chỗ 20p

      // Nếu không chọn phòng (hoặc không có phòng), dùng giá mặc định của toilet
      const finalPrice = selectedRoom ? selectedRoom.price : toilet.price || 0;
      const finalRoomId = selectedRoom ? selectedRoom.id : "general"; // 'general' cho đặt chung
      const finalRoomNumber = selectedRoom
        ? selectedRoom.roomNumber
        : "Tự chọn tại quầy";

      const bookingData = {
        userId: user?.uid,
        userEmail: user?.email,
        userName: userName.trim(),
        userPhone: userPhone.trim(),

        toiletId: toilet.id,
        toiletName: toilet.name,
        toiletAddress: toilet.address,

        roomId: finalRoomId,
        roomNumber: finalRoomNumber,

        status: "pending", // -> Chờ check-in
        paymentStatus: "pending",
        totalPrice: finalPrice,

        notes: notes.trim(),
        bookingTime: now.toISOString(),
        estimatedArrival: eta.toISOString(),
        expiryTime: expiry.toISOString(),
        type: "pre_order",
      };

      const bookingRef = await addDoc(collection(db, "bookings"), bookingData);

      // Nếu có chọn phòng cụ thể -> Cập nhật trạng thái phòng
      if (selectedRoom) {
        await updateDoc(doc(db, "rooms", selectedRoom.id), {
          status: "booked",
          currentBookingId: bookingRef.id,
          lastUpdated: now.toISOString(),
        });
      }

      Alert.alert(
        "🎉 Đặt chỗ thành công!",
        `Mã đơn: #${bookingRef.id
          .slice(0, 5)
          .toUpperCase()}\nVui lòng đến cửa hàng và quét mã QR để Check-in.`,
        [{ text: "OK", onPress: onClose }]
      );
    } catch (error: any) {
      console.error(error);
      Alert.alert("Lỗi", error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getRoomTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      single: "🚿 Đơn",
      couple: "💑 Đôi",
      family: "👨‍👩‍👧 Gia đình",
    };
    return labels[type] || type;
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Đặt trước tại {toilet?.name}</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.content}>
          {/* PHẦN 1: CHỌN PHÒNG (Chỉ hiện nếu có phòng available) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="bed" size={18} />{" "}
              {rooms.length > 0 ? "Chọn phòng" : "Thông tin dịch vụ"}
            </Text>

            {loading ? (
              <ActivityIndicator size="small" color="#2196F3" />
            ) : rooms.length > 0 ? (
              <View style={styles.roomGrid}>
                {rooms.map((room) => (
                  <TouchableOpacity
                    key={room.id}
                    style={[
                      styles.roomCard,
                      selectedRoom?.id === room.id && styles.roomCardSelected,
                    ]}
                    onPress={() => setSelectedRoom(room)}
                  >
                    <View style={styles.roomHeader}>
                      <Text style={styles.roomNumber}>{room.roomNumber}</Text>
                      <View style={styles.roomTypeBadge}>
                        <Text style={styles.roomTypeText}>
                          {getRoomTypeLabel(room.type)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.roomPrice}>
                      {room.price.toLocaleString()}đ
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.noRoomBox}>
                <Ionicons
                  name="information-circle-outline"
                  size={24}
                  color="#666"
                />
                <Text style={styles.noRoomText}>
                  Địa điểm này chưa cập nhật danh sách phòng cụ thể. Bạn vui
                  lòng đặt vé chung và chọn phòng khi đến nơi.
                </Text>
                <Text style={styles.priceHighlight}>
                  Giá vé: {Number(toilet?.price).toLocaleString()}đ
                </Text>
              </View>
            )}
          </View>

          {/* PHẦN 2: THÔNG TIN */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin liên hệ</Text>
            <TextInput
              style={styles.input}
              value={userName}
              onChangeText={setUserName}
              placeholder="Họ tên"
            />
            <TextInput
              style={styles.input}
              value={userPhone}
              onChangeText={setUserPhone}
              placeholder="Số điện thoại"
              keyboardType="phone-pad"
            />
          </View>

          {/* PHẦN 3: THỜI GIAN */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bao lâu nữa bạn tới?</Text>
            <View style={styles.timeSelector}>
              {["10", "15", "20", "30"].map((mins) => (
                <TouchableOpacity
                  key={mins}
                  style={[
                    styles.timeChip,
                    estimatedMinutes === mins && styles.timeChipSelected,
                  ]}
                  onPress={() => setEstimatedMinutes(mins)}
                >
                  <Text
                    style={[
                      styles.timeChipText,
                      estimatedMinutes === mins && styles.timeChipTextSelected,
                    ]}
                  >
                    {mins} phút
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.inputArea}
              placeholder="Ghi chú thêm..."
              multiline
              value={notes}
              onChangeText={setNotes}
            />

            <View style={styles.warningBox}>
              <Ionicons name="wallet-outline" size={20} color="#FF9800" />
              <Text style={styles.warningText}>
                Chưa cần thanh toán ngay. Vui lòng thanh toán tại quầy khi sử
                dụng xong.
              </Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmitBooking}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitBtnText}>XÁC NHẬN ĐẶT CHỖ</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    paddingTop: 50,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 16, fontWeight: "bold", color: "#333" },
  content: { flex: 1 },
  section: { backgroundColor: "white", padding: 20, marginTop: 10 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },

  // Room Grid Styles
  roomGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  roomCard: {
    width: "48%",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 15,
    borderWidth: 2,
    borderColor: "transparent",
  },
  roomCardSelected: { borderColor: "#4CAF50", backgroundColor: "#E8F5E9" },
  roomHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  roomNumber: { fontSize: 20, fontWeight: "bold", color: "#333" },
  roomTypeBadge: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roomTypeText: { fontSize: 11, color: "#1976D2", fontWeight: "bold" },
  roomPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2196F3",
    marginTop: 5,
  },

  // No Room Box
  noRoomBox: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F9F9F9",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  noRoomText: {
    textAlign: "center",
    color: "#666",
    marginVertical: 10,
    lineHeight: 20,
  },
  priceHighlight: { fontSize: 18, fontWeight: "bold", color: "#2196F3" },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "white",
    marginBottom: 15,
  },
  inputArea: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "white",
    height: 80,
    textAlignVertical: "top",
    marginTop: 15,
  },

  timeSelector: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  timeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "white",
  },
  timeChipSelected: { backgroundColor: "#2196F3", borderColor: "#2196F3" },
  timeChipText: { color: "#666", fontWeight: "500" },
  timeChipTextSelected: { color: "white", fontWeight: "bold" },

  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    gap: 10,
  },
  warningText: { flex: 1, fontSize: 13, color: "#E65100" },

  footer: {
    padding: 20,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  submitBtn: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  submitBtnDisabled: { backgroundColor: "#B0BEC5" },
  submitBtnText: { color: "white", fontSize: 16, fontWeight: "bold" },
});
