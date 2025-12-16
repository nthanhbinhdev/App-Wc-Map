// components/ui/UserAccountComponent.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
// Gom nhóm import Firebase Auth
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
} from "firebase/auth";
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
// Import Firebase Storage
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// ✅ Dùng SafeAreaView từ thư viện chuẩn này để fix Warning deprecated
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../../../firebaseConfig";
import ToiletDetailModal from "../../ToiletDetailModal";
// 👉 Import Hook Theme
import { useTheme } from "../../../contexts/ThemeContext";

// Import các component con
import MyBookings from "../MyBookings";
import ActiveBookingCard from "./ActiveBookingCard";
import ChangePasswordModal from "./ChangePasswordModal";
import EditProfileModal from "./EditProfileModal";
import ProfileHeader from "./ProfileHeader";
import SettingsModal from "./SettingsModal";

export default function UserAccountComponent() {
  const router = useRouter();
  const user = auth.currentUser;

  // 👉 1. Lấy theme từ Context
  const { theme, isDarkMode } = useTheme();

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
  const [changePassModalVisible, setChangePassModalVisible] = useState(false);

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

  // 🔥 HÀM UPLOAD "BẤT TỬ" LÊN FIREBASE STORAGE
  const uploadImageToFirebase = async (uri: string) => {
    try {
      console.log("🚀 Đang chuẩn bị upload:", uri);

      const blob: any = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
          resolve(xhr.response);
        };
        xhr.onerror = function (e) {
          console.log("XHR Error:", e);
          reject(new TypeError("Network request failed"));
        };
        xhr.responseType = "blob";
        xhr.open("GET", uri, true);
        xhr.send(null);
      });

      const storage = getStorage();
      const filename = `avatars/${user?.uid}_${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);

      console.log("📤 Đang đẩy Blob lên Storage...");
      const uploadTask = uploadBytesResumable(storageRef, blob);

      return new Promise<string>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log("Upload is " + progress + "% done");
          },
          (error) => {
            console.error("Upload thất bại:", error);
            blob.close(); // Giải phóng bộ nhớ
            reject(error);
          },
          async () => {
            // Upload thành công -> Lấy URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log("🎉 Upload thành công! URL:", downloadURL);
            blob.close(); // Giải phóng bộ nhớ
            resolve(downloadURL);
          }
        );
      });
    } catch (error: any) {
      console.error("🔥 Lỗi trong quá trình upload:", error);
      throw error;
    }
  };

  const handleUpdateProfile = async (
    nameInput: string,
    photoURLInput: string,
    phoneInput: string,
    imageUri: string | null
  ) => {
    if (!user) return;

    if (!nameInput.trim()) {
      Alert.alert("Lỗi", "Tên hiển thị không được để trống!");
      return;
    }

    try {
      let finalPhotoURL = photoURLInput;

      if (imageUri) {
        finalPhotoURL = await uploadImageToFirebase(imageUri);
      }

      await updateProfile(user, {
        displayName: nameInput.trim(),
        photoURL: finalPhotoURL || null,
      });

      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          phoneNumber: phoneInput.trim(),
          photoURL: finalPhotoURL || null,
          displayName: nameInput.trim(),
          updatedAt: new Date().toISOString(),
          email: user.email,
        },
        { merge: true }
      );

      setNewPhotoURL(finalPhotoURL);
      setNewName(nameInput);
      setNewPhone(phoneInput);

      Alert.alert("✅ Thành công", "Hồ sơ đã được cập nhật!");
      setEditModalVisible(false);
      router.replace("/(tabs)/account");
    } catch (error: any) {
      console.error("Update profile error:", error);
      Alert.alert("❌ Lỗi cập nhật", error.message);
    }
  };

  const handleChangePassword = async (currentPass: string, newPass: string) => {
    if (!user || !user.email) return;
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPass);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPass);
      Alert.alert("✅ Thành công", "Mật khẩu đã được thay đổi!");
      setChangePassModalVisible(false);
    } catch (error: any) {
      console.error("Change pass error:", error);
      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/wrong-password"
      ) {
        throw new Error("Mật khẩu hiện tại không đúng.");
      }
      throw new Error("Có lỗi xảy ra, vui lòng thử lại sau.");
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
            Alert.alert("Đã xóa", "Đánh giá đã được xóa");
          } catch (error: any) {
            Alert.alert("Lỗi", error.message);
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

  // Render Review Item với màu động
  const renderReviewItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: theme.card, // Đổi màu nền card
          borderColor: theme.border,
          shadowColor: isDarkMode ? "#000" : "#000",
        },
      ]}
      activeOpacity={0.7}
      onPress={() => handleRevisit(item)}
    >
      <View
        style={[
          styles.iconSquare,
          { backgroundColor: isDarkMode ? "#332C00" : "#FFF8E1" },
        ]}
      >
        <Ionicons name="star" size={24} color="#FBC02D" />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.rowBetween}>
          <Text
            style={[styles.cardTitle, { color: theme.text }]}
            numberOfLines={1}
          >
            {item.toiletName}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={styles.dateText}>
              {new Date(item.createdAt).toLocaleDateString("vi-VN")}
            </Text>
            <TouchableOpacity
              onPress={() => handleDeleteReview(item.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[styles.deleteBtn, { backgroundColor: theme.iconBg }]}
            >
              <Ionicons name="trash-outline" size={16} color={theme.danger} />
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
          <View
            style={[styles.revisitBadge, { backgroundColor: theme.iconBg }]}
          >
            <Text style={[styles.revisitText, { color: theme.primary }]}>
              Quay lại
            </Text>
            <Ionicons name="arrow-forward" size={10} color={theme.primary} />
          </View>
        </View>

        {item.comment && (
          <Text
            style={[styles.cardSub, { color: theme.subText }]}
            numberOfLines={2}
          >
            "{item.comment}"
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", backgroundColor: theme.background },
        ]}
      >
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={theme.background}
      />

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
            tintColor={theme.text}
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
              onChangePassword={() => setChangePassModalVisible(true)}
            />

            <ActiveBookingCard
              booking={activeBooking}
              onPress={() => setShowMyBookings(true)}
            />

            {/* Section Header */}
            <View style={styles.listHeaderContainer}>
              <Text style={[styles.sectionHeaderTitle, { color: theme.text }]}>
                Lịch sử trải nghiệm
              </Text>
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
                        {
                          backgroundColor: isActive
                            ? theme.primary
                            : theme.card,
                          borderColor: isActive ? theme.primary : theme.border,
                        },
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
                          { color: isActive ? "white" : theme.subText },
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
                tintColor: isDarkMode ? "#555" : undefined,
              }}
            />
            <Text style={[styles.emptyText, { color: theme.text }]}>
              Chưa có trải nghiệm nào
            </Text>
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
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <View
            style={[
              styles.modalHeader,
              { backgroundColor: theme.card, borderBottomColor: theme.border },
            ]}
          >
            <TouchableOpacity
              onPress={() => setShowMyBookings(false)}
              style={[styles.modalCloseBtn, { backgroundColor: theme.iconBg }]}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.modalHeaderTitle, { color: theme.text }]}>
              Quản lý đặt chỗ
            </Text>
            <View style={{ width: 40 }} />
          </View>
          <MyBookings />
        </View>
      </Modal>

      <ChangePasswordModal
        visible={changePassModalVisible}
        onClose={() => setChangePassModalVisible(false)}
        onSave={handleChangePassword}
      />

      <ToiletDetailModal
        visible={detailModalVisible}
        toilet={selectedToilet}
        onClose={() => setDetailModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionHeaderTitle: { fontSize: 18, fontWeight: "800" },
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
    marginRight: 8,
    borderWidth: 1,
  },
  filterText: { fontSize: 13, fontWeight: "600" },
  card: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
    elevation: 2,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    borderWidth: 1,
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
    marginBottom: 4,
    flex: 1,
  },
  cardSub: {
    fontSize: 13,
    marginTop: 6,
    fontStyle: "italic",
  },
  dateText: { fontSize: 12, color: "#999" },
  deleteBtn: { padding: 4, borderRadius: 6 },
  revisitBadge: {
    flexDirection: "row",
    alignItems: "center",
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
  emptyText: { marginTop: 10, fontSize: 16, fontWeight: "700" },
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
    borderBottomWidth: 1,
  },
  modalCloseBtn: { padding: 8, borderRadius: 20 },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: "800",
    flex: 1,
    textAlign: "center",
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
