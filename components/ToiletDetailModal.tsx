import { Ionicons } from "@expo/vector-icons";
import {
  addDoc,
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../firebaseConfig";
import BookingForm from "./ui/BookingForm";
import QRScanner from "./ui/QRScanner";

const formatDistance = (meters: any) => {
  if (!meters) return "...";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

// BẢNG DỊCH TIỆN ÍCH SANG TIẾNG VIỆT
const AMENITY_LABELS: Record<string, string> = {
  hot_water: "Nước nóng",
  towel: "Khăn tắm",
  soap: "Dầu gội/Sữa tắm",
  hair_dryer: "Máy sấy",
  locker: "Tủ đồ",
  parking: "Gửi xe",
  wifi: "Wifi Free",
  wc: "Nhà vệ sinh",
  sauna: "Xông hơi",
  massage: "Massage",
  laundry: "Giặt ủi",
  shop: "Tạp hóa",
  charge: "Sạc ĐT",
  accessible: "Lối xe lăn",
};

// 👉 DANH SÁCH TAG ĐÁNH GIÁ NHANH
const REVIEW_TAGS = [
  "Sạch sẽ 🧼",
  "Nước mạnh 🚿",
  "Riêng tư 🔒",
  "Giá tốt 💸",
  "Thơm tho 🌸",
  "Tiện nghi ✨",
  "Thân thiện 😊",
  "An ninh 🛡️",
];

interface ToiletDetailModalProps {
  visible: boolean;
  onClose: () => void;
  toilet: any;
}

export default function ToiletDetailModal({
  visible,
  onClose,
  toilet,
}: ToiletDetailModalProps) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewText, setReviewText] = useState("");
  const [myRating, setMyRating] = useState(0);

  // 👉 State lưu các tag đã chọn
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [isWritingReview, setIsWritingReview] = useState(false);

  // State điều khiển Modal
  const [bookingFormVisible, setBookingFormVisible] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  useEffect(() => {
    // Reset form khi đổi toilet
    setMyRating(0);
    setReviewText("");
    setSelectedTags([]); // Reset tags
    setIsWritingReview(false);
  }, [toilet]);

  useEffect(() => {
    if (!toilet) return;
    const q = query(
      collection(db, "reviews"),
      where("toiletId", "==", toilet.id),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setReviews(list);
    });
    return () => unsubscribe();
  }, [toilet]);

  // Xử lý chọn/bỏ chọn tag
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // BUTTON 1: ĐẶT TRƯỚC (Giữ chỗ)
  const handleBookingRequest = () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Yêu cầu", "Bạn cần đăng nhập để đặt chỗ.");
      return;
    }
    setBookingFormVisible(true);
  };

  // BUTTON 2: ĐẾN NƠI RỒI -> CHECK-IN NGAY (Walk-in)
  const handleDirectCheckIn = () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Yêu cầu", "Bạn cần đăng nhập để check-in.");
      return;
    }
    setScannerVisible(true);
  };

  const submitReview = async () => {
    if (myRating === 0) {
      Alert.alert("Khoan!", "Vui lòng chọn số sao ⭐");
      return;
    }
    const user = auth.currentUser;
    if (!user) return;

    try {
      await addDoc(collection(db, "reviews"), {
        toiletId: toilet.id,
        userEmail: user.email,
        userName: user.displayName || "Ẩn danh",
        userPhoto: user.photoURL,
        rating: myRating,
        comment: reviewText,
        tags: selectedTags, // 👉 Lưu tags vào Firestore
        createdAt: new Date().toISOString(),
      });
      await updateDoc(doc(db, "toilets", toilet.id), {
        rating:
          ((toilet.rating || 5) * (toilet.ratingCount || 1) + myRating) /
          ((toilet.ratingCount || 1) + 1),
        ratingCount: increment(1),
      });
      Alert.alert("Cảm ơn! 🌟", "Đánh giá của bạn giúp cộng đồng tốt hơn!");

      // Reset form sau khi gửi
      setMyRating(0);
      setReviewText("");
      setSelectedTags([]);
      setIsWritingReview(false);
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    }
  };

  if (!toilet) return null;

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.headerNav}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {toilet.name}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Image
            source={{
              uri:
                toilet.image ||
                "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600",
            }}
            style={styles.heroImage}
          />

          <View style={styles.section}>
            <Text style={styles.title}>{toilet.name}</Text>
            <View style={styles.ratingRow}>
              <Text style={styles.ratingBig}>
                {toilet.rating ? toilet.rating.toFixed(1) : 5.0}
              </Text>
              <Ionicons name="star" size={16} color="#FBC02D" />
              <Text style={styles.ratingCount}>
                {" "}
                ({toilet.ratingCount || 0} đánh giá)
              </Text>
            </View>
            <Text style={styles.subtitle}>
              📍 {formatDistance(toilet.distance)} • {toilet.address}
            </Text>
          </View>

          {/* ACTION BUTTONS */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.mainBtn, styles.bookBtn]}
              onPress={handleBookingRequest}
            >
              <Ionicons name="calendar-outline" size={20} color="white" />
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.btnTitle}>Đặt trước</Text>
                <Text style={styles.btnSub}>Giữ chỗ 15p</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mainBtn, styles.checkInBtn]}
              onPress={handleDirectCheckIn}
            >
              <Ionicons name="qr-code-outline" size={20} color="white" />
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.btnTitle}>Check-in ngay</Text>
                <Text style={styles.btnSub}>Quét mã tại quầy</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <View style={styles.infoRow}>
              <Ionicons
                name="pricetag-outline"
                size={20}
                color="#555"
                style={{ marginRight: 10 }}
              />
              <Text style={styles.infoText}>
                {toilet.price === 0
                  ? "Miễn phí"
                  : `${Number(toilet.price).toLocaleString()}đ / lượt`}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons
                name="time-outline"
                size={20}
                color="#555"
                style={{ marginRight: 10 }}
              />
              <Text style={styles.infoText}>Mở cửa: 05:30 - 23:00</Text>
            </View>
            {toilet.amenities && (
              <View style={styles.chipContainer}>
                {toilet.amenities.map((am: string) => (
                  <View key={am} style={styles.chip}>
                    <Text style={styles.chipText}>
                      {AMENITY_LABELS[am] || am}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.divider} />

          {/* PHẦN ĐÁNH GIÁ */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Đánh giá & Bình luận</Text>
            {!isWritingReview ? (
              <TouchableOpacity
                style={styles.writeReviewBtn}
                onPress={() => setIsWritingReview(true)}
              >
                <Ionicons name="create-outline" size={20} color="#0288D1" />
                <Text style={{ color: "#0288D1", marginLeft: 5 }}>
                  Viết đánh giá
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.reviewForm}>
                <Text style={{ marginBottom: 10, fontWeight: "600" }}>
                  Đánh giá trải nghiệm của bạn:
                </Text>

                {/* CHỌN SAO */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "center",
                    marginBottom: 15,
                  }}
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setMyRating(star)}
                      style={{ padding: 5 }}
                    >
                      <Ionicons
                        name={star <= myRating ? "star" : "star-outline"}
                        size={32}
                        color="#FBC02D"
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* 👉 CHỌN TAG (QUICK TAGS) */}
                <Text style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
                  Ưu điểm nổi bật (Chọn nhanh):
                </Text>
                <View style={styles.tagsContainer}>
                  {REVIEW_TAGS.map((tag, index) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.reviewTag,
                          isSelected && styles.reviewTagSelected,
                        ]}
                        onPress={() => toggleTag(tag)}
                      >
                        <Text
                          style={[
                            styles.reviewTagText,
                            isSelected && styles.reviewTagTextSelected,
                          ]}
                        >
                          {tag}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TextInput
                  style={styles.reviewInput}
                  placeholder="Nhập bình luận chi tiết (nếu có)..."
                  multiline
                  value={reviewText}
                  onChangeText={setReviewText}
                />

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    gap: 10,
                    marginTop: 10,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => {
                      setIsWritingReview(false);
                      setSelectedTags([]);
                    }}
                  >
                    <Text style={{ color: "#666", padding: 10 }}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={submitReview}
                    style={{
                      backgroundColor: "#0288D1",
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ color: "white", fontWeight: "bold" }}>
                      Gửi
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* DANH SÁCH REVIEW */}
            {reviews.map((rev) => (
              <View key={rev.id} style={styles.reviewItem}>
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <Text style={styles.reviewerName}>{rev.userName}</Text>
                    <Text style={{ fontSize: 10, color: "#999" }}>
                      {rev.createdAt
                        ? new Date(rev.createdAt).toLocaleDateString()
                        : ""}
                    </Text>
                  </View>

                  <View style={{ flexDirection: "row", marginVertical: 4 }}>
                    {[...Array(5)].map((_, i) => (
                      <Ionicons
                        key={i}
                        name={i < rev.rating ? "star" : "star-outline"}
                        size={12}
                        color="#FBC02D"
                      />
                    ))}
                  </View>

                  {/* 👉 HIỂN THỊ TAG TRONG REVIEW */}
                  {rev.tags && rev.tags.length > 0 && (
                    <View style={styles.displayTagsRow}>
                      {rev.tags.map((t: string, i: number) => (
                        <View key={i} style={styles.miniTag}>
                          <Text style={styles.miniTagText}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {rev.comment ? (
                    <Text style={styles.reviewText}>{rev.comment}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>

        <BookingForm
          visible={bookingFormVisible}
          onClose={() => setBookingFormVisible(false)}
          toilet={toilet}
        />
        <QRScanner
          visible={scannerVisible}
          onClose={() => setScannerVisible(false)}
          toiletData={toilet}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  headerNav: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: { padding: 5 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "bold", marginLeft: 10 },
  scrollContent: { paddingBottom: 20 },
  heroImage: { width: "100%", height: 200, resizeMode: "cover" },
  section: { padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", color: "#202124" },
  subtitle: { color: "#5F6368", marginTop: 4 },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  ratingBig: { fontSize: 16, fontWeight: "bold", marginRight: 5 },
  ratingCount: { color: "#666", fontSize: 12 },

  actionRow: { flexDirection: "row", padding: 15, gap: 10 },
  mainBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
  },
  bookBtn: { backgroundColor: "#2196F3" },
  checkInBtn: { backgroundColor: "#4CAF50" },
  btnTitle: { color: "white", fontWeight: "bold", fontSize: 14 },
  btnSub: { color: "rgba(255,255,255,0.8)", fontSize: 10 },

  divider: { height: 8, backgroundColor: "#F0F2F5" },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  infoText: { fontSize: 15, color: "#333" },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 5,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    backgroundColor: "#E3F2FD",
  },
  chipText: { fontSize: 12, color: "#1976D2" },

  sectionHeader: { fontSize: 18, fontWeight: "bold", marginBottom: 15 },
  writeReviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  reviewForm: {
    padding: 15,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    marginBottom: 15,
  },

  // 👉 Styles cho Tags Selector
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  reviewTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DDD",
    backgroundColor: "white",
  },
  reviewTagSelected: { borderColor: "#2196F3", backgroundColor: "#E3F2FD" },
  reviewTagText: { fontSize: 12, color: "#666" },
  reviewTagTextSelected: { color: "#1976D2", fontWeight: "600" },

  reviewInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
    height: 80,
    textAlignVertical: "top",
  },

  reviewItem: {
    marginTop: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 15,
  },
  reviewerName: { fontWeight: "bold", fontSize: 14 },

  // 👉 Styles cho Mini Tags trong Review List
  displayTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  miniTag: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniTagText: { fontSize: 10, color: "#666" },

  reviewText: { marginTop: 4, color: "#444", lineHeight: 20 },
});
