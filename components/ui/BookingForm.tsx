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
  initialName?: string;
  initialPhone?: string;
  isWalkIn?: boolean;
}

export default function BookingForm({
  visible,
  onClose,
  toilet,
  initialName,
  initialPhone,
  isWalkIn = false,
}: BookingFormProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // Form state
  const [guestName, setGuestName] = useState(initialName || "");
  const [guestPhone, setGuestPhone] = useState(initialPhone || "");
  const [arrivalTime, setArrivalTime] = useState(isWalkIn ? 0 : 15);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Đồng bộ lại state khi props thay đổi (fix lỗi không tự điền tên)
  useEffect(() => {
    if (visible) {
      setGuestName(initialName || "");
      setGuestPhone(initialPhone || "");
      setArrivalTime(isWalkIn ? 0 : 15);
    }
  }, [visible, initialName, initialPhone, isWalkIn]);

  // Load danh sách phòng trống
  useEffect(() => {
    if (!visible || !toilet?.id) return;

    const fetchRooms = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "rooms"),
          where("toiletId", "==", toilet.id),
          where("status", "==", "available")
        );
        const snapshot = await getDocs(q);
        const roomList = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Room[];
        setRooms(roomList);
      } catch (error) {
        console.error("Lỗi tải phòng:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [visible, toilet]);

  const handleBooking = async () => {
    if (!selectedRoom) {
      Alert.alert(
        "Chưa chọn phòng",
        "Vui lòng chọn loại phòng bạn muốn sử dụng."
      );
      return;
    }

    if (!guestName.trim() || !guestPhone.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập tên và số điện thoại.");
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date();
      const expectedTime = new Date(now.getTime() + arrivalTime * 60000);

      const bookingStatus = isWalkIn ? "checked_in" : "pending";
      const checkInTimeVal = isWalkIn ? now.toISOString() : null;

      const bookingData = {
        userId: auth.currentUser?.uid || "guest",
        guestName,
        guestPhone,
        toiletId: toilet.id,
        toiletName: toilet.name,
        toiletAddress: toilet.address,
        roomId: selectedRoom.id,
        roomNumber: selectedRoom.roomNumber,
        roomType: selectedRoom.type,
        price: selectedRoom.price,
        status: bookingStatus,
        createdAt: now.toISOString(),
        expectedArrival: expectedTime.toISOString(),
        checkInTime: checkInTimeVal,
        note,
        paymentStatus: "unpaid",
      };

      await addDoc(collection(db, "bookings"), bookingData);

      await updateDoc(doc(db, "rooms", selectedRoom.id), {
        status: "occupied",
        lastUpdated: now.toISOString(),
      });

      const successTitle = isWalkIn
        ? "Check-in Thành Công!"
        : "Đặt Chỗ Thành Công!";
      const successMsg = isWalkIn
        ? `Bạn đã check-in vào phòng ${selectedRoom.roomNumber}.`
        : `Bạn đã đặt phòng ${selectedRoom.roomNumber}. Vui lòng đến trong vòng ${arrivalTime} phút nữa.`;

      Alert.alert(" " + successTitle, successMsg, [
        { text: "OK", onPress: onClose },
      ]);
    } catch (error: any) {
      Alert.alert("Lỗi", "Không thể tạo đơn: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {isWalkIn ? "Check-in Trực Tiếp" : "Đặt Giữ Chỗ"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.infoBox}>
              <Text style={styles.toiletName}>{toilet?.name}</Text>
              <Text style={styles.toiletAddress}>{toilet?.address}</Text>
            </View>

            <Text style={styles.sectionTitle}>1. Chọn Phòng Trống</Text>
            {loading ? (
              <ActivityIndicator style={{ marginTop: 20 }} color="#2196F3" />
            ) : rooms.length === 0 ? (
              <Text style={styles.emptyText}>
                Hiện không còn phòng trống :(
              </Text>
            ) : (
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
                      <Ionicons
                        name={
                          selectedRoom?.id === room.id
                            ? "checkmark-circle"
                            : "radio-button-off"
                        }
                        size={20}
                        color={
                          selectedRoom?.id === room.id ? "#2196F3" : "#999"
                        }
                      />
                      <Text
                        style={[
                          styles.roomNum,
                          selectedRoom?.id === room.id && styles.textSelected,
                        ]}
                      >
                        P.{room.roomNumber}
                      </Text>
                    </View>
                    <Text style={styles.roomType}>{room.type}</Text>
                    <Text style={styles.roomPrice}>
                      {room.price.toLocaleString()}đ
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.sectionTitle}>2. Thông Tin Của Bạn</Text>
            <TextInput
              style={styles.input}
              placeholder="Tên của bạn"
              value={guestName}
              onChangeText={setGuestName}
            />
            <TextInput
              style={styles.input}
              placeholder="Số điện thoại"
              keyboardType="phone-pad"
              value={guestPhone}
              onChangeText={setGuestPhone}
            />

            {!isWalkIn && (
              <>
                <Text style={styles.sectionTitle}>3. Bao lâu nữa bạn tới?</Text>
                <View style={styles.timeSelector}>
                  {[5, 10, 15, 30].map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.timeChip,
                        arrivalTime === m && styles.timeChipSelected,
                      ]}
                      onPress={() => setArrivalTime(m)}
                    >
                      <Text
                        style={[
                          styles.timeChipText,
                          arrivalTime === m && styles.timeChipTextSelected,
                        ]}
                      >
                        {m} phút
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <TextInput
              style={styles.inputArea}
              placeholder="Ghi chú thêm (nếu có)..."
              multiline
              value={note}
              onChangeText={setNote}
            />

            <View style={styles.warningBox}>
              <Ionicons name="information-circle" size={20} color="#F57C00" />
              <Text style={styles.warningText}>
                {isWalkIn
                  ? "Vui lòng giữ vệ sinh chung khi sử dụng."
                  : "Vui lòng đến đúng giờ. Đơn sẽ tự hủy sau 10 phút trễ."}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <View>
              <Text style={styles.totalLabel}>Tổng tạm tính:</Text>
              <Text style={styles.totalPrice}>
                {selectedRoom ? selectedRoom.price.toLocaleString() : "0"}đ
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!selectedRoom || submitting) && styles.disabledBtn,
              ]}
              disabled={!selectedRoom || submitting}
              onPress={handleBooking}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {isWalkIn ? "Check-in & Vào" : "Xác Nhận Đặt"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#F5F7FA",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  title: { fontSize: 18, fontWeight: "bold", color: "#333" },
  content: { padding: 20 },

  infoBox: { marginBottom: 20 },
  toiletName: { fontSize: 16, fontWeight: "bold", color: "#333" },
  toiletAddress: { fontSize: 14, color: "#666", marginTop: 4 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginTop: 15,
    marginBottom: 10,
  },
  emptyText: { textAlign: "center", color: "#999", marginVertical: 20 },

  roomGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  roomCard: {
    width: "48%",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  roomCardSelected: { borderColor: "#2196F3", backgroundColor: "#E3F2FD" },
  roomHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  roomNum: { fontWeight: "bold", color: "#333" },
  textSelected: { color: "#1976D2" },
  roomType: { fontSize: 12, color: "#666", marginBottom: 4 },
  roomPrice: { fontSize: 14, fontWeight: "bold", color: "#2196F3" },

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
    marginBottom: 40,
  },
  warningText: { marginLeft: 10, color: "#F57C00", flex: 1, fontSize: 13 },

  footer: {
    backgroundColor: "white",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 30,
  },
  totalLabel: { fontSize: 12, color: "#666" },
  totalPrice: { fontSize: 20, fontWeight: "bold", color: "#2196F3" },
  submitBtn: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 12,
  },
  disabledBtn: { backgroundColor: "#B0BEC5" },
  submitBtnText: { color: "white", fontWeight: "bold", fontSize: 16 },
});
