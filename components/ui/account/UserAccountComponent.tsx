// components/ui/UserAccountComponent.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { updateProfile } from "firebase/auth";
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    setDoc,
    where,
} from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image, // 👉 Đã thêm lại Image
    Modal, // 👉 Đã thêm lại Modal
    Platform,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { auth, db } from "../../../firebaseConfig";
import ToiletDetailModal from "../../ToiletDetailModal";

// 👉 Import 4 component con
import MyBookings from "../MyBookings";
import ActiveBookingCard from "./ActiveBookingCard";
import EditProfileModal from "./EditProfileModal";
import ProfileHeader from "./ProfileHeader";
import SettingsModal from "./SettingsModal";

export default function UserAccountComponent() {
  const router = useRouter();
  const user = auth.currentUser;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [stats, setStats] = useState({ count: 0 });

  // State quản lý bộ lọc
  const [activeSort, setActiveSort] = useState("sort_newest");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  // Modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || "");
  const [newPhotoURL, setNewPhotoURL] = useState(user?.photoURL || "");
  const [newPhone, setNewPhone] = useState("");
  const [showMyBookings, setShowMyBookings] = useState(false);
  const [selectedToilet, setSelectedToilet] = useState<any>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Cấu hình option cho lịch sử đánh giá
  const FILTER_OPTIONS = [
    { id: "sort_newest", label: "Mới nhất", type: "sort" },
    { id: "sort_oldest", label: "Cũ nhất", type: "sort" },
    { id: "filter_5star", label: "5 Sao", type: "filter" },
    { id: "filter_comment", label: "Có comment", type: "filter" },
  ];

  useEffect(() => {
    fetchData();
    fetchActiveBooking();
    fetchUserData();
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setNewPhone(data.phoneNumber || "");
      }
    } catch (error) {
      console.log("Error fetching user data:", error);
    }
  };

  const fetchData = async () => {
    if (!user) return;
    if (!refreshing) setLoading(true);

    try {
      const qRev = query(
        collection(db, "reviews"),
        where("userEmail", "==", user.email)
      );
      const snapRev = await getDocs(qRev);

      const list = await Promise.all(
        snapRev.docs.map(async (d) => {
          const reviewData = d.data();
          let finalName = reviewData.toiletName;

          if (!finalName && reviewData.toiletId) {
            try {
              const toiletDoc = await getDoc(
                doc(db, "toilets", reviewData.toiletId)
              );
              if (toiletDoc.exists()) {
                finalName = toiletDoc.data().name;
              }
            } catch (err) {
              console.log("Không lấy được tên toilet:", err);
            }
          }

          return {
            id: d.id,
            ...reviewData,
            toiletName: finalName || "Địa điểm cũ",
          };
        })
      );

      list.sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setReviews(list);
      setStats({ count: list.length });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchActiveBooking = async () => {
    if (!user) return;

    const q = query(
      collection(db, "bookings"),
      where("userId", "==", user.uid),
      where("status", "in", ["pending", "checked_in"])
    );

    try {
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        docs.sort(
          (a: any, b: any) =>
            new Date(b.bookingTime).getTime() -
            new Date(a.bookingTime).getTime()
        );
        setActiveBooking(docs[0]);
      } else {
        setActiveBooking(null);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const processedReviews = useMemo(() => {
    let list = [...reviews];

    if (activeFilters.includes("filter_5star")) {
      list = list.filter((item) => (Number(item.rating) || 0) >= 5);
    }
    if (activeFilters.includes("filter_comment")) {
      list = list.filter(
        (item) => item.comment && item.comment.trim().length > 0
      );
    }

    if (activeSort === "sort_oldest") {
      list.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    } else {
      list.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return list;
  }, [reviews, activeSort, activeFilters]);

  const handleToggleFilter = (id: string, type: string) => {
    if (type === "sort") {
      setActiveSort(id);
    } else {
      if (activeFilters.includes(id)) {
        setActiveFilters((prev) => prev.filter((item) => item !== id));
      } else {
        setActiveFilters((prev) => [...prev, id]);
      }
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
    fetchActiveBooking();
    fetchUserData();
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    if (!newName.trim()) {
      Alert.alert("Lỗi", "Tên hiển thị không được để trống!");
      return;
    }

    try {
      await updateProfile(user, {
        displayName: newName.trim(),
        photoURL: newPhotoURL.trim() || null,
      });

      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          phoneNumber: newPhone.trim(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      Alert.alert("✅ Thành công", "Hồ sơ đã được cập nhật!");
      setEditModalVisible(false);
      router.replace("/(tabs)/account");
    } catch (error: any) {
      console.error("Update profile error:", error);
      Alert.alert("❌ Lỗi", error.message);
    }
  };

  const handleLogout = () => {
    Alert.alert("Đăng xuất", "Bạn có chắc muốn đăng xuất?", [
      { text: "Ở lại", style: "cancel" },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: () => auth.signOut().then(() => router.replace("/login")),
      },
    ]);
  };

  const handleDeleteReview = (reviewId: string) => {
    Alert.alert("Xóa đánh giá", "Bạn có chắc muốn xóa đánh giá này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "reviews", reviewId));
            setReviews((prev) => prev.filter((item) => item.id !== reviewId));
            setStats((prev) => ({
              ...prev,
              count: Math.max(0, prev.count - 1),
            }));
            Alert.alert("✅ Đã xóa", "Đánh giá đã được xóa");
          } catch (error: any) {
            Alert.alert("❌ Lỗi", error.message);
          }
        },
      },
    ]);
  };

  const handleRevisit = async (item: any) => {
    if (!item.toiletId) return;

    try {
      const docRef = doc(db, "toilets", item.toiletId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setSelectedToilet({ id: docSnap.id, ...docSnap.data() });
        setDetailModalVisible(true);
      } else {
        Alert.alert("Tiếc quá", "Địa điểm này không còn hoạt động");
      }
    } catch (e) {
      console.error("Lỗi fetch toilet:", e);
    }
  };

  const renderReviewItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => handleRevisit(item)}
    >
      <View style={[styles.iconSquare, { backgroundColor: "#FFF8E1" }]}>
        <Ionicons name="star" size={24} color="#FBC02D" />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.toiletName}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={styles.dateText}>
              {new Date(item.createdAt).toLocaleDateString("vi-VN")}
            </Text>
            <TouchableOpacity
              onPress={() => handleDeleteReview(item.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.deleteBtn}
            >
              <Ionicons name="trash-outline" size={16} color="#FF5252" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.rowBetween, { marginTop: 4 }]}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={styles.ratingText}>
              {item.rating ? Number(item.rating).toFixed(1) : "5.0"}
            </Text>
            <View style={{ flexDirection: "row" }}>
              {[...Array(5)].map((_, i) => (
                <Ionicons
                  key={i}
                  name={i < (item.rating || 5) ? "star" : "star-outline"}
                  size={12}
                  color="#FBC02D"
                />
              ))}
            </View>
          </View>
          <View style={styles.revisitBadge}>
            <Text style={styles.revisitText}>Quay lại</Text>
            <Ionicons name="arrow-forward" size={10} color="#2196F3" />
          </View>
        </View>

        {item.comment && (
          <Text style={styles.cardSub} numberOfLines={2}>
            "{item.comment}"
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <FlatList
        data={processedReviews}
        renderItem={renderReviewItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2196F3"]}
          />
        }
        ListHeaderComponent={
          <>
            <ProfileHeader
              user={user}
              stats={stats}
              onEditProfile={() => {
                setNewName(user?.displayName || "");
                setNewPhotoURL(user?.photoURL || "");
                setEditModalVisible(true);
              }}
              onOpenSettings={() => setSettingsModalVisible(true)}
              onLogout={handleLogout}
            />

            <ActiveBookingCard
              booking={activeBooking}
              onPress={() => setShowMyBookings(true)}
            />

            {/* Section Header */}
            <View style={styles.listHeaderContainer}>
              <Text style={styles.sectionHeaderTitle}>Lịch sử trải nghiệm</Text>
              <TouchableOpacity onPress={() => setShowMyBookings(true)}>
                <Text style={styles.linkText}>Quản lý đặt chỗ</Text>
              </TouchableOpacity>
            </View>

            {/* UI THANH LỌC FILTER */}
            <View style={{ paddingLeft: 20, paddingBottom: 10 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {FILTER_OPTIONS.map((f) => {
                  const isActive =
                    activeSort === f.id || activeFilters.includes(f.id);
                  return (
                    <TouchableOpacity
                      key={f.id}
                      style={[
                        styles.filterChip,
                        isActive && styles.filterChipActive,
                      ]}
                      onPress={() => handleToggleFilter(f.id, f.type)}
                    >
                      {isActive && (
                        <Ionicons
                          name="checkmark"
                          size={14}
                          color="white"
                          style={{ marginRight: 4 }}
                        />
                      )}
                      <Text
                        style={[
                          styles.filterText,
                          isActive && styles.filterTextActive,
                        ]}
                      >
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Image
              source={{
                uri: "https://cdn-icons-png.flaticon.com/512/7486/7486744.png",
              }}
              style={{
                width: 100,
                height: 100,
                opacity: 0.5,
                marginBottom: 15,
              }}
            />
            <Text style={styles.emptyText}>Chưa có trải nghiệm nào</Text>
            <Text style={styles.emptySubText}>
              Không tìm thấy đánh giá nào khớp với bộ lọc...
            </Text>
            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={() => {
                if (activeFilters.length > 0 || activeSort !== "sort_newest") {
                  setActiveFilters([]);
                  setActiveSort("sort_newest");
                } else {
                  router.replace("/(tabs)/");
                }
              }}
            >
              <Text style={styles.exploreBtnText}>
                {activeFilters.length > 0 ? "Xóa bộ lọc" : "Khám phá ngay"}
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      <EditProfileModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        onSave={handleUpdateProfile}
        user={user}
        newName={newName}
        setNewName={setNewName}
        newPhotoURL={newPhotoURL}
        setNewPhotoURL={setNewPhotoURL}
        newPhone={newPhone}
        setNewPhone={setNewPhone}
      />

      <SettingsModal
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
        onLogout={handleLogout}
        onEditProfile={() => {
          setNewName(user?.displayName || "");
          setNewPhotoURL(user?.photoURL || "");
          setEditModalVisible(true);
        }}
      />

      {/* My Bookings Modal */}
      <Modal
        visible={showMyBookings}
        animationType="slide"
        onRequestClose={() => setShowMyBookings(false)}
      >
        <View style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowMyBookings(false)}
              style={styles.modalCloseBtn}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Quản lý đặt chỗ</Text>
            <View style={{ width: 40 }} />
          </View>
          <MyBookings />
        </View>
      </Modal>

      {/* Toilet Detail Modal */}
      <ToiletDetailModal
        visible={detailModalVisible}
        toilet={selectedToilet}
        onClose={() => setDetailModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  sectionHeaderTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A1A" },
  listHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  linkText: { color: "#2196F3", fontWeight: "600", fontSize: 14 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "white",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  filterChipActive: {
    backgroundColor: "#2196F3",
    borderColor: "#2196F3",
  },
  filterText: { fontSize: 13, fontWeight: "600", color: "#555" },
  filterTextActive: { color: "white" },
  card: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    backgroundColor: "white",
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  iconSquare: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardTitle: {
    fontWeight: "700",
    fontSize: 15,
    color: "#202124",
    marginBottom: 4,
    flex: 1,
  },
  cardSub: {
    color: "#5F6368",
    fontSize: 13,
    marginTop: 6,
    fontStyle: "italic",
  },
  dateText: { fontSize: 12, color: "#999" },
  deleteBtn: { padding: 4, backgroundColor: "#FFEBEE", borderRadius: 6 },
  revisitBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  revisitText: { fontSize: 10, fontWeight: "700", color: "#2196F3" },
  emptyContainer: {
    alignItems: "center",
    marginTop: 40,
    paddingHorizontal: 40,
  },
  emptyText: { marginTop: 10, color: "#333", fontSize: 16, fontWeight: "700" },
  emptySubText: {
    marginTop: 5,
    color: "#999",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20,
  },
  exploreBtn: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    elevation: 2,
  },
  exploreBtnText: { color: "white", fontWeight: "bold", fontSize: 14 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingTop: Platform.OS === "android" ? 40 : 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  modalCloseBtn: { padding: 8, borderRadius: 20, backgroundColor: "#F5F5F5" },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: "800",
    flex: 1,
    textAlign: "center",
    color: "#333",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  ratingText: {
    fontWeight: "bold",
    fontSize: 13,
    color: "#FFB300",
    marginRight: 4,
  },
});
