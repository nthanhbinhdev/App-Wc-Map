import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { updateProfile } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../firebaseConfig";
import { seedDatabase } from "../../utils/seedToilets";
import ToiletDetailModal from "../ToiletDetailModal";
import MyBookings from "./MyBookings";

export default function UserProfile() {
  const router = useRouter();
  const user = auth.currentUser;

  const [userRole, setUserRole] = useState<"user" | "provider" | null>(null);
  const [activeTab, setActiveTab] = useState<string>("");
  const [dataList, setDataList] = useState<any[]>([]);
  const [stats, setStats] = useState({ count: 0 });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [activeBooking, setActiveBooking] = useState<any>(null);

  // Modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || "");
  const [showMyBookings, setShowMyBookings] = useState(false);

  // State cho việc xem lại địa điểm cũ
  const [selectedToilet, setSelectedToilet] = useState<any>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  useEffect(() => {
    const initProfile = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          const role = userDoc.data()?.role || "user";
          setUserRole(role);
          if (role === "provider") setActiveTab("places");
          else setActiveTab("reviews");
        } catch (e) {
          setUserRole("user");
          setActiveTab("reviews");
        }
      }
    };
    initProfile();
  }, [user]);

  // LISTEN ACTIVE BOOKING (Cho User)
  useEffect(() => {
    if (user && userRole === "user") {
      const q = query(
        collection(db, "bookings"),
        where("userId", "==", user.uid),
        where("status", "in", ["pending", "checked_in"])
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          docs.sort(
            (a: any, b: any) =>
              new Date(b.bookingTime).getTime() -
              new Date(a.bookingTime).getTime()
          );
          setActiveBooking(docs[0]);
        } else {
          setActiveBooking(null);
        }
      });
      return () => unsubscribe();
    }
  }, [user, userRole]);

  // FETCH DATA LIST
  const fetchData = async () => {
    if (!user || !userRole || !activeTab) return;
    if (!refreshing) setLoading(true);

    setDataList([]);
    try {
      if (userRole === "provider" && activeTab === "places") {
        const qWC = query(
          collection(db, "toilets"),
          where("createdBy", "==", user.email)
        );
        const snapWC = await getDocs(qWC);
        const list: any[] = [];
        snapWC.forEach((doc) =>
          list.push({ id: doc.id, ...doc.data(), type: "place" })
        );
        setDataList(list);
        setStats({ count: list.length });
      } else if (userRole === "user" && activeTab === "reviews") {
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
              type: "review",
            };
          })
        );

        list.sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setDataList(list);
        setStats({ count: list.length });
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, userRole]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [activeTab, userRole]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    try {
      await updateProfile(user, { displayName: newName });
      Alert.alert("Thành công", "Tên hiển thị đã được cập nhật!");
      setEditModalVisible(false);
    } catch (error: any) {
      Alert.alert("Lỗi", error.message);
    }
  };

  const handleLogout = () => {
    Alert.alert("Đăng xuất", "Bạn có chắc muốn đăng xuất khỏi tài khoản?", [
      { text: "Ở lại", style: "cancel" },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: () => auth.signOut().then(() => router.replace("/login")),
      },
    ]);
  };

  // 👉 HÀM XÓA REVIEW
  const handleDeleteReview = (reviewId: string) => {
    Alert.alert(
      "Xóa đánh giá",
      "Bạn có chắc muốn xóa bài đánh giá này không? Hành động này không thể hoàn tác.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa luôn",
          style: "destructive",
          onPress: async () => {
            try {
              // Xóa trên Firestore
              await deleteDoc(doc(db, "reviews", reviewId));

              // Cập nhật lại UI ngay lập tức (xóa khỏi mảng dataList)
              setDataList((prevList) =>
                prevList.filter((item) => item.id !== reviewId)
              );
              setStats((prev) => ({
                ...prev,
                count: Math.max(0, prev.count - 1),
              }));

              Alert.alert("Đã xóa", "Bài đánh giá đã bay màu! 🗑️");
            } catch (error: any) {
              Alert.alert("Lỗi", "Không xóa được: " + error.message);
            }
          },
        },
      ]
    );
  };

  const handleSeedData = async () => {
    if (!user?.email) return;
    Alert.alert("Xác nhận", "Tạo 10 địa điểm mẫu cho tài khoản này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Tạo ngay",
        onPress: async () => {
          setSeeding(true);
          try {
            await seedDatabase(user.email!);
            Alert.alert(
              "Thành công",
              "Đã tạo dữ liệu mẫu. Vui lòng vuốt xuống để làm mới danh sách."
            );
            fetchData();
          } catch (error: any) {
            Alert.alert("Lỗi", error.message);
          } finally {
            setSeeding(false);
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
        Alert.alert("Tiếc quá", "Địa điểm này có vẻ đã ngừng hoạt động.");
      }
    } catch (e) {
      console.log("Lỗi fetch toilet:", e);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    if (item.type === "place") {
      return (
        <View style={styles.card}>
          <View style={[styles.iconSquare, { backgroundColor: "#E3F2FD" }]}>
            <Ionicons name="business" size={24} color="#2196F3" />
          </View>
          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.priceTag}>
                {Number(item.price).toLocaleString()}đ
              </Text>
            </View>
            <Text style={styles.cardSub} numberOfLines={1}>
              {item.address}
            </Text>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      item.status === "approved" ? "#4CAF50" : "#FF9800",
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: item.status === "approved" ? "#4CAF50" : "#FF9800" },
                ]}
              >
                {item.status === "approved" ? "Đang hoạt động" : "Chờ duyệt"}
              </Text>
            </View>
          </View>
        </View>
      );
    } else {
      return (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => handleRevisit(item)}
        >
          <View style={[styles.iconSquare, { backgroundColor: "#FFF8E1" }]}>
            <Ionicons name="star" size={24} color="#FFC107" />
          </View>
          <View style={{ flex: 1 }}>
            {/* Hàng 1: Tên + Ngày + Nút xóa */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.toiletName}
              </Text>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Text style={styles.dateText}>
                  {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                </Text>
                {/* 👉 Nút thùng rác */}
                <TouchableOpacity
                  onPress={() => handleDeleteReview(item.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={16} color="#FF5252" />
                </TouchableOpacity>
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 4,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text
                  style={{
                    fontWeight: "bold",
                    fontSize: 13,
                    color: "#FFB300",
                    marginRight: 4,
                  }}
                >
                  {item.rating ? Number(item.rating).toFixed(1) : "5.0"}
                </Text>
                <View style={{ flexDirection: "row" }}>
                  {[...Array(5)].map((_, i) => (
                    <Ionicons
                      key={i}
                      name={i < (item.rating || 5) ? "star" : "star-outline"}
                      size={12}
                      color="#FFC107"
                    />
                  ))}
                </View>
              </View>
              <View style={styles.revisitBadge}>
                <Text style={styles.revisitText}>Quay lại</Text>
                <Ionicons name="arrow-forward" size={10} color="#2196F3" />
              </View>
            </View>

            <Text style={styles.cardSub} numberOfLines={2}>
              "{item.comment}"
            </Text>
          </View>
        </TouchableOpacity>
      );
    }
  };

  if (!userRole)
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <FlatList
        data={dataList}
        renderItem={renderItem}
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
            <View style={styles.profileHeader}>
              <View style={styles.userInfoRow}>
                <Image
                  source={{
                    uri:
                      user?.photoURL ||
                      `https://ui-avatars.com/api/?name=${user?.displayName}&background=random`,
                  }}
                  style={styles.avatarLarge}
                />
                <View style={{ flex: 1, justifyContent: "center" }}>
                  <Text style={styles.nameLarge}>
                    {user?.displayName || "Người dùng"}
                  </Text>
                  <Text style={styles.emailLabel}>{user?.email}</Text>
                  <View style={styles.roleBadge}>
                    <Ionicons
                      name={userRole === "provider" ? "business" : "person"}
                      size={12}
                      color="#1565C0"
                    />
                    <Text style={styles.roleText}>
                      {userRole === "provider"
                        ? "Đối tác Kinh doanh"
                        : "Thành viên thân thiết"}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.editIconBtn}
                  onPress={() => setEditModalVisible(true)}
                >
                  <Ionicons name="settings-outline" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>{stats.count}</Text>
                  <Text style={styles.statLabel}>
                    {userRole === "provider" ? "Địa điểm" : "Lượt trải nghiệm"}
                  </Text>
                </View>
                <View style={styles.verticalDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>0</Text>
                  <Text style={styles.statLabel}>Điểm thưởng</Text>
                </View>
              </View>

              <View style={styles.actionGrid}>
                {userRole === "provider" && (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={handleSeedData}
                    disabled={seeding}
                  >
                    <View
                      style={[
                        styles.actionIcon,
                        { backgroundColor: "#E8F5E9" },
                      ]}
                    >
                      {seeding ? (
                        <ActivityIndicator size="small" color="#2E7D32" />
                      ) : (
                        <Ionicons
                          name="construct-outline"
                          size={22}
                          color="#2E7D32"
                        />
                      )}
                    </View>
                    <Text style={styles.actionText}>Tạo Data mẫu</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={handleLogout}
                >
                  <View
                    style={[styles.actionIcon, { backgroundColor: "#FFEBEE" }]}
                  >
                    <Ionicons
                      name="log-out-outline"
                      size={22}
                      color="#C62828"
                    />
                  </View>
                  <Text style={[styles.actionText, { color: "#C62828" }]}>
                    Đăng xuất
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {userRole === "user" && activeBooking && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionHeaderTitle}>
                  🔥 Hoạt động hiện tại
                </Text>
                <TouchableOpacity
                  style={[
                    styles.activeCard,
                    {
                      borderColor:
                        activeBooking.status === "checked_in"
                          ? "#4CAF50"
                          : "#FF9800",
                    },
                  ]}
                  onPress={() => setShowMyBookings(true)}
                  activeOpacity={0.9}
                >
                  <View style={styles.activeCardContent}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.activeHeaderRow}>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor:
                                activeBooking.status === "checked_in"
                                  ? "#E8F5E9"
                                  : "#FFF3E0",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              {
                                color:
                                  activeBooking.status === "checked_in"
                                    ? "#2E7D32"
                                    : "#EF6C00",
                              },
                            ]}
                          >
                            {activeBooking.status === "checked_in"
                              ? "ĐANG SỬ DỤNG"
                              : "CHỜ CHECK-IN"}
                          </Text>
                        </View>
                        <Text style={styles.activeTime}>
                          {new Date(
                            activeBooking.bookingTime
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                      </View>
                      <Text style={styles.activeToiletName}>
                        {activeBooking.toiletName}
                      </Text>
                      <Text style={styles.activeAddress} numberOfLines={1}>
                        📍 {activeBooking.toiletAddress}
                      </Text>
                    </View>
                    <View style={styles.activeArrow}>
                      <Ionicons name="chevron-forward" size={24} color="#ccc" />
                    </View>
                  </View>
                  <View
                    style={[
                      styles.activeFooter,
                      {
                        backgroundColor:
                          activeBooking.status === "checked_in"
                            ? "#4CAF50"
                            : "#FF9800",
                      },
                    ]}
                  >
                    <Text style={styles.activeFooterText}>
                      {activeBooking.status === "checked_in"
                        ? "Thanh toán & Trả phòng"
                        : "Lấy mã QR Check-in"}
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color="white" />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.listHeaderContainer}>
              <Text style={styles.sectionHeaderTitle}>
                {userRole === "provider"
                  ? "📍 Địa điểm của tôi"
                  : "⭐ Lịch sử trải nghiệm"}
              </Text>
              {userRole === "user" && (
                <TouchableOpacity onPress={() => setShowMyBookings(true)}>
                  <Text style={styles.linkText}>Quản lý đặt chỗ</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        }
        ListEmptyComponent={
          !loading ? (
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
              <Text style={styles.emptyText}>Chưa có dữ liệu nào</Text>
              <Text style={styles.emptySubText}>
                {userRole === "provider"
                  ? "Hãy thêm địa điểm đầu tiên của bạn!"
                  : "Bạn chưa trải nghiệm địa điểm nào."}
              </Text>

              {userRole === "user" && (
                <TouchableOpacity
                  style={styles.exploreBtn}
                  onPress={() => router.replace("/(tabs)/")}
                >
                  <Text style={styles.exploreBtnText}>Khám phá ngay</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <ActivityIndicator style={{ marginTop: 20 }} color="#2196F3" />
          )
        }
      />

      {/* MODALS */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Đổi tên hiển thị</Text>
            <TextInput
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
              placeholder="Nhập tên mới..."
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.cancelBtn}
              >
                <Text style={{ color: "#666", fontWeight: "600" }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUpdateProfile}
                style={styles.confirmBtn}
              >
                <Text style={{ color: "white", fontWeight: "bold" }}>
                  Lưu thay đổi
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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

  // HEADER
  profileHeader: {
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 40 : 20,
    paddingBottom: 20,
    marginBottom: 10,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  userInfoRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  avatarLarge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 15,
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  nameLarge: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  emailLabel: { fontSize: 13, color: "#666", marginBottom: 6 },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  roleText: {
    color: "#1565C0",
    fontWeight: "700",
    fontSize: 11,
    marginLeft: 4,
  },
  editIconBtn: { padding: 10, backgroundColor: "#F5F5F5", borderRadius: 50 },

  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    padding: 15,
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 20,
  },
  statBox: { alignItems: "center", flex: 1 },
  statNumber: { fontSize: 20, fontWeight: "800", color: "#333" },
  statLabel: { fontSize: 12, color: "#888", marginTop: 2 },
  verticalDivider: { width: 1, height: 30, backgroundColor: "#DDD" },

  actionGrid: { flexDirection: "row", justifyContent: "flex-start", gap: 20 },
  actionBtn: { alignItems: "center" },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  actionText: { fontSize: 12, fontWeight: "600", color: "#555" },

  // SECTION STYLES
  sectionContainer: { paddingHorizontal: 20, marginBottom: 10 },
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

  // ACTIVE CARD
  activeCard: {
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: "hidden",
    marginTop: 10,
  },
  activeCardContent: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  activeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  statusBadgeText: { fontSize: 10, fontWeight: "800" },
  activeTime: { fontSize: 12, color: "#999", fontWeight: "500" },
  activeToiletName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#333",
    marginBottom: 4,
  },
  activeAddress: { fontSize: 13, color: "#666" },
  activeArrow: { justifyContent: "center", paddingLeft: 10 },
  activeFooter: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    gap: 5,
  },
  activeFooterText: { color: "white", fontWeight: "700", fontSize: 14 },

  // LIST CARD
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
  cardSub: { color: "#5F6368", fontSize: 13, marginBottom: 6 },
  dateText: { fontSize: 12, color: "#999" },
  statusRow: { flexDirection: "row", alignItems: "center" },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: "600" },
  priceTag: { fontSize: 14, fontWeight: "700", color: "#2196F3" },

  // Style cho nút xóa
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

  // EMPTY STATE
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

  // MODAL EDIT
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    padding: 24,
    borderRadius: 24,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: "#F9F9F9",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: "#2196F3",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  // MODAL FULLSCREEN
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
});
