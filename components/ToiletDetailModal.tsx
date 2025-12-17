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
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  music: "Nhạc thư giãn",
};

export default function ToiletDetailModal({ visible, toilet, onClose }: any) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [showBooking, setShowBooking] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // THÊM state user profile để điền form cho nhanh
  const [userProfile, setUserProfile] = useState<any>(null);

  // THÊM state xác định có phải Walk-in từ Scanner hay không
  const [isWalkInMode, setIsWalkInMode] = useState(false);

  // Review states
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // ✅ FIX: Dùng ref để track listeners
  const userListenerRef = useRef<(() => void) | null>(null);
  const reviewsListenerRef = useRef<(() => void) | null>(null);

  const REVIEW_TAGS = [
    "Sạch sẽ",
    "Thoáng mát",
    "Đầy đủ tiện nghi",
    "Giá hợp lý",
    "Nhân viên thân thiện",
  ];


  const displayImage = useMemo(() => {
    if (toilet?.images?.length > 0) return toilet.images[0];
    if (toilet?.image) return toilet.image;
  return require('../assets/images/nha-tam-dep-23.jpg');
  }, [toilet]);


  useEffect(() => {
    if (!visible || !auth.currentUser) {
      // Cleanup khi modal đóng
      if (userListenerRef.current) {
        userListenerRef.current();
        userListenerRef.current = null;
      }
      return;
    }

    // Hủy listener cũ (nếu có)
    if (userListenerRef.current) {
      userListenerRef.current();
    }

    const userRef = doc(db, "users", auth.currentUser.uid);
    const unsub = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserProfile(docSnap.data());
      }
    });

    userListenerRef.current = unsub;

    return () => {
      if (userListenerRef.current) {
        userListenerRef.current();
        userListenerRef.current = null;
      }
    };
  }, [visible]); // ✅ Add visible to deps

  // ✅ FIX: Cleanup listener cũ trước khi tạo mới
  useEffect(() => {
    if (!visible || !toilet?.id) {
      // Cleanup khi modal đóng
      if (reviewsListenerRef.current) {
        reviewsListenerRef.current();
        reviewsListenerRef.current = null;
      }
      setReviews([]); // ✅ Reset reviews khi đóng
      return;
    }

    // Hủy listener cũ (nếu có)
    if (reviewsListenerRef.current) {
      reviewsListenerRef.current();
    }

    const q = query(
      collection(db, "reviews"),
      where("toiletId", "==", toilet.id),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReviews(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    reviewsListenerRef.current = unsubscribe;

    return () => {
      if (reviewsListenerRef.current) {
        reviewsListenerRef.current();
        reviewsListenerRef.current = null;
      }
    };
  }, [visible, toilet?.id]); // ✅ Add visible to deps

  // ✅ FIX: Reset state khi modal đóng
  useEffect(() => {
    if (!visible) {
      setRating(0);
      setComment("");
      setSelectedTags([]);
      setShowBooking(false);
      setShowScanner(false);
      setIsWalkInMode(false);
    }
  }, [visible]);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const submitReview = async () => {
    if (rating === 0) {
      Alert.alert("Chưa đánh giá", "Vui lòng chọn số sao!");
      return;
    }

    try {
      await addDoc(collection(db, "reviews"), {
        toiletId: toilet.id,
        userId: auth.currentUser?.uid || "anonymous",
        userName: auth.currentUser?.displayName ?? "Khách ẩn danh",
        userEmail: auth.currentUser?.email, // ✅ Add email for better tracking
        rating,
        comment,
        tags: selectedTags,
        createdAt: new Date().toISOString(),
      });

      // Update aggregate rating
      const toiletRef = doc(db, "toilets", toilet.id);
      await updateDoc(toiletRef, {
        ratingCount: increment(1),
        ratingTotal: increment(rating),
      });

      setRating(0);
      setComment("");
      setSelectedTags([]);
      Alert.alert("Cảm ơn!", "Đánh giá của bạn đã được ghi nhận.");
    } catch (error) {
      console.error("Submit review error:", error);
      Alert.alert("Lỗi", "Không thể gửi đánh giá. Vui lòng thử lại.");
    }
  };

  // 👉 Hàm xử lý khi quét QR thành công (cho Walk-in)
  const handleScanSuccess = (scannedId?: string) => {
    console.log("Scanner matched ID:", scannedId);
    // Đóng scanner -> Mở form chọn phòng với mode Walk-in
    setIsWalkInMode(true);
    setShowScanner(false);

    // Đợi 1 chút cho modal scanner đóng hẳn rồi mới mở form booking để tránh conflict UI
    setTimeout(() => {
      setShowBooking(true);
    }, 500);
  };

  // Hàm mở form đặt trước (Pre-order)
  const handleOpenBooking = () => {
    setIsWalkInMode(false); // Đặt trước -> không phải walk-in
    setShowBooking(true);
  };

  // ✅ CRITICAL FIX: Di chuyển early return XUỐNG DƯỚI tất cả hooks
  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {toilet?.name || "Chi tiết"}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Image
            source={displayImage}
            style={styles.image} // ✅ FIX: Add missing style
            onError={(e) =>
              console.log("Image failed to load:", e.nativeEvent.error)
            }
          />

          <View style={styles.detailsContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.name}>{toilet?.name}</Text>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.ratingText}>
                  {toilet?.ratingTotal && toilet?.ratingCount
                    ? (toilet.ratingTotal / toilet.ratingCount).toFixed(1)
                    : "New"}
                </Text>
              </View>
            </View>

            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color="#666" />
              <Text style={styles.address}>{toilet?.address}</Text>
            </View>
            <Text style={styles.distance}>
              Cách bạn: {formatDistance(toilet?.distance)}
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Tiện ích</Text>
            <View style={styles.amenitiesGrid}>
              {toilet?.amenities?.map((am: string) => (
                <View key={am} style={styles.amenityItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  <Text style={styles.amenityText}>
                    {AMENITY_LABELS[am] || am}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Đánh giá & Bình luận</Text>

            {/* Form đánh giá */}
            <View style={styles.reviewForm}>
              <Text style={styles.subTitle}>Viết đánh giá của bạn:</Text>
              <View style={styles.rateReviewBtn}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setRating(star)}>
                    <Ionicons
                      name={star <= rating ? "star" : "star-outline"}
                      size={28}
                      color="#FFD700"
                      style={{ marginRight: 5 }}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.tagsContainer}>
                {REVIEW_TAGS.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.reviewTag,
                      selectedTags.includes(tag) && styles.reviewTagSelected,
                    ]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text
                      style={[
                        styles.reviewTagText,
                        selectedTags.includes(tag) &&
                          styles.reviewTagTextSelected,
                      ]}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.reviewInput}
                placeholder="Chia sẻ trải nghiệm..."
                multiline
                value={comment}
                onChangeText={setComment}
              />
              <TouchableOpacity
                style={styles.submitReviewBtn}
                onPress={submitReview}
              >
                <Text style={styles.submitReviewText}>Gửi Đánh Giá</Text>
              </TouchableOpacity>
            </View>

            {/* Danh sách Review */}
            {reviews.map((rv) => (
              <View key={rv.id} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewUser}>{rv.userName}</Text>
                  <View style={{ flexDirection: "row" }}>
                    {Array.from({ length: rv.rating }).map((_, i) => (
                      <Ionicons key={i} name="star" size={12} color="#FFD700" />
                    ))}
                  </View>
                </View>
                {/* Hiển thị Tags của review này */}
                {rv.tags && rv.tags.length > 0 && (
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 5,
                      marginBottom: 5,
                    }}
                  >
                    {rv.tags.map((t: string, idx: number) => (
                      <View
                        key={idx}
                        style={{
                          backgroundColor: "#F5F5F5",
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4,
                        }}
                      >
                        <Text style={{ fontSize: 10, color: "#666" }}>{t}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <Text style={styles.reviewContent}>{rv.comment}</Text>
                <Text style={styles.reviewDate}>
                  {new Date(rv.createdAt).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => setShowScanner(true)}
          >
            <Ionicons name="qr-code-outline" size={24} color="white" />
            <Text style={styles.scanText}>Check-in Ngay</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bookButton}
            onPress={handleOpenBooking}
          >
            <Text style={styles.bookText}>Đặt Giữ Chỗ</Text>
          </TouchableOpacity>
        </View>

        {/* Modal Đặt Chỗ */}
        <BookingForm
          visible={showBooking}
          onClose={() => setShowBooking(false)}
          toilet={toilet}
          initialName={userProfile?.fullName}
          initialPhone={userProfile?.phoneNumber}
          isWalkIn={isWalkInMode}
        />

        {/* Modal Scan QR */}
        <QRScanner
          visible={showScanner}
          onClose={() => setShowScanner(false)}
          toiletData={toilet}
          onSuccess={handleScanSuccess}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: { padding: 5 },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  content: { paddingBottom: 100 },
  image: { width: "100%", height: 200, resizeMode: "cover" }, // ✅ FIX: Now used
  detailsContainer: { padding: 20 },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  name: { fontSize: 22, fontWeight: "bold", flex: 1, marginRight: 10 },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9C4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: { marginLeft: 4, fontWeight: "bold", fontSize: 12 },
  locationRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  address: { marginLeft: 5, color: "#666", fontSize: 14, flex: 1 },
  distance: { fontSize: 12, color: "#999", marginTop: 5 },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15 },
  amenitiesGrid: { flexDirection: "row", flexWrap: "wrap" },
  amenityItem: {
    width: "50%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  amenityText: { marginLeft: 8, color: "#444" },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    padding: 15,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    gap: 10,
  },
  scanButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
  },
  scanText: { color: "white", fontWeight: "bold", marginLeft: 8 },
  bookButton: {
    flex: 1,
    backgroundColor: "#2196F3",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
  },
  bookText: { color: "white", fontWeight: "bold" },

  // Styles Review
  subTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
    color: "#555",
  },
  rateReviewBtn: {
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
  submitReviewBtn: {
    marginTop: 10,
    backgroundColor: "#FF9800",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  submitReviewText: { color: "white", fontWeight: "bold" },
  reviewItem: {
    marginTop: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 15,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  reviewUser: { fontWeight: "bold", fontSize: 14 },
  reviewContent: { fontSize: 14, color: "#333", lineHeight: 20 },
  reviewDate: { fontSize: 12, color: "#999", marginTop: 5 },
});
