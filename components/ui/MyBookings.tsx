import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../firebaseConfig";
import QRScanner from "./QRScanner";

export default function MyBookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // State xử lý Checkout & Rating & Scanning
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "bookings"),
      where("userId", "==", user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      list.sort(
        (a, b) =>
          new Date(b.bookingTime).getTime() - new Date(a.bookingTime).getTime()
      );
      setBookings(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // Handle: Bấm nút "Quét QR Check-in" cho booking đang Pending
  const handleCheckInPress = (booking: any) => {
    setSelectedBooking(booking);
    setScannerVisible(true);
  };

  // Handle: Bấm nút "Thanh toán & Về" cho booking đang Active
  const handleCheckOut = (booking: any) => {
    Alert.alert(
      "Thanh toán & Trả phòng",
      `Tổng tiền: ${Number(
        booking.price
      ).toLocaleString()}đ\nXác nhận thanh toán?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Thanh toán ngay",
          onPress: async () => {
            try {
              await updateDoc(doc(db, "bookings", booking.id), {
                status: "completed",
                paymentStatus: "paid",
                checkOutTime: new Date().toISOString(),
              });
              if (booking.roomId) {
                await updateDoc(doc(db, "rooms", booking.roomId), {
                  status: "available",
                });
              }
              // Mở đánh giá
              setTimeout(() => {
                setSelectedBooking(booking);
                setRatingModalVisible(true);
              }, 500);
            } catch (e: any) {
              Alert.alert("Lỗi", e.message);
            }
          },
        },
      ]
    );
  };

  const submitRating = async () => {
    Alert.alert("Đã gửi đánh giá", "Cảm ơn bạn!");
    setRatingModalVisible(false);
    setRating(0);
    setComment("");
  };

  const renderItem = ({ item }: { item: any }) => {
    const isPending = item.status === "pending";
    const isActive = item.status === "checked_in";
    const isCompleted = item.status === "completed";

    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.toiletName}>{item.toiletName}</Text>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: isPending
                  ? "#FF9800"
                  : isActive
                  ? "#4CAF50"
                  : "#9E9E9E",
              },
            ]}
          >
            <Text style={styles.badgeText}>
              {isPending
                ? "CHỜ CHECK-IN"
                : isActive
                ? "ĐANG DÙNG"
                : "HOÀN THÀNH"}
            </Text>
          </View>
        </View>

        <Text style={styles.subText}>{item.toiletAddress}</Text>
        <Text style={styles.subText}>
          {Number(item.price).toLocaleString()}đ
        </Text>
        <Text style={styles.dateText}>
          {new Date(item.checkInTime).toLocaleString("vi-VN")}
        </Text>

        <View style={styles.actionRow}>
          {isPending && (
            <TouchableOpacity
              style={styles.btnCheckIn}
              onPress={() => handleCheckInPress(item)}
            >
              <Ionicons name="qr-code-outline" size={18} color="white" />
              <Text style={styles.btnText}>Quét QR để nhận phòng</Text>
            </TouchableOpacity>
          )}

          {isActive && (
            <TouchableOpacity
              style={styles.btnCheckOut}
              onPress={() => handleCheckOut(item)}
            >
              <Ionicons name="card-outline" size={18} color="white" />
              <Text style={styles.btnText}>Thanh toán & Trả phòng</Text>
            </TouchableOpacity>
          )}

          {isCompleted && (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="checkmark-done" size={16} color="green" />
              <Text style={{ color: "green", marginLeft: 5 }}>
                Đã thanh toán
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lịch sử Đặt chỗ</Text>
      {loading ? (
        <ActivityIndicator color="#2196F3" />
      ) : (
        <FlatList
          data={bookings}
          renderItem={renderItem}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", color: "#999", marginTop: 20 }}>
              Chưa có lịch sử đặt chỗ
            </Text>
          }
        />
      )}

      {/* Dùng Scanner để check-in cho booking đang chọn */}
      <QRScanner
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        bookingData={selectedBooking}
      />

      <Modal visible={ratingModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Đánh giá dịch vụ</Text>
            <Text style={{ textAlign: "center", marginBottom: 10 }}>
              {selectedBooking?.toiletName}
            </Text>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                marginBottom: 15,
              }}
            >
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setRating(s)}
                  style={{ padding: 5 }}
                >
                  <Ionicons
                    name={s <= rating ? "star" : "star-outline"}
                    size={32}
                    color="#FBC02D"
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Nhập nhận xét..."
              value={comment}
              onChangeText={setComment}
            />
            <TouchableOpacity style={styles.btnSubmit} onPress={submitRating}>
              <Text style={{ color: "white", fontWeight: "bold" }}>
                Gửi đánh giá
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", padding: 20 },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    marginTop: 40,
    color: "#333",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  toiletName: { fontSize: 16, fontWeight: "bold", color: "#333", flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: "white", fontSize: 10, fontWeight: "bold" },
  subText: { color: "#666", marginBottom: 4 },
  dateText: { color: "#999", fontSize: 12, marginBottom: 10 },
  actionRow: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 10,
  },
  btnCheckIn: {
    backgroundColor: "#2196F3",
    flexDirection: "row",
    padding: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  btnCheckOut: {
    backgroundColor: "#F44336",
    flexDirection: "row",
    padding: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  btnText: { color: "white", fontWeight: "bold", marginLeft: 5 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 30,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    height: 80,
    textAlignVertical: "top",
    marginBottom: 15,
  },
  btnSubmit: {
    backgroundColor: "#2196F3",
    width: "100%",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
});
