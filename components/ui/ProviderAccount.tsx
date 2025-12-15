// components/ui/ProviderAccount.tsx - ACCOUNT CHUYÊN BIỆT CHO PROVIDER
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { updateProfile } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../firebaseConfig";
import { seedDatabase } from "../../utils/seedToilets";

interface BusinessStats {
  totalLocations: number;
  activeLocations: number;
  totalRooms: number;
  totalBookings: number;
  todayBookings: number;
  monthBookings: number;
  totalRevenue: number;
  monthRevenue: number;
  avgRating: number;
  totalReviews: number;
}

export default function ProviderAccount() {
  const router = useRouter();
  const user = auth.currentUser;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<BusinessStats>({
    totalLocations: 0,
    activeLocations: 0,
    totalRooms: 0,
    totalBookings: 0,
    todayBookings: 0,
    monthBookings: 0,
    totalRevenue: 0,
    monthRevenue: 0,
    avgRating: 0,
    totalReviews: 0,
  });

  // Modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || "");
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetchBusinessStats();
  }, [user]);

  const fetchBusinessStats = async () => {
    if (!user) return;
    if (!refreshing) setLoading(true);

    try {
      // 1. Locations Stats
      const qToilets = query(
        collection(db, "toilets"),
        where("createdBy", "==", user.email)
      );
      const toiletsSnap = await getDocs(qToilets);

      const toiletIds: string[] = [];
      let activeCount = 0;
      let totalRating = 0;
      let totalReviews = 0;

      toiletsSnap.forEach((doc) => {
        const data = doc.data();
        toiletIds.push(doc.id);
        if (data.status === "approved") activeCount++;
        if (data.rating) totalRating += data.rating;
        if (data.ratingCount) totalReviews += data.ratingCount;
      });

      // 2. Rooms Stats (với chunking)
      let totalRooms = 0;
      if (toiletIds.length > 0) {
        const chunks = [];
        const CHUNK_SIZE = 10;
        for (let i = 0; i < toiletIds.length; i += CHUNK_SIZE) {
          chunks.push(toiletIds.slice(i, i + CHUNK_SIZE));
        }

        for (const chunk of chunks) {
          const qRooms = query(
            collection(db, "rooms"),
            where("toiletId", "in", chunk)
          );
          const roomsSnap = await getDocs(qRooms);
          totalRooms += roomsSnap.size;
        }
      }

      // 3. Bookings & Revenue Stats
      let totalBookings = 0;
      let todayBookings = 0;
      let monthBookings = 0;
      let totalRevenue = 0;
      let monthRevenue = 0;

      if (toiletIds.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

        const chunks = [];
        const CHUNK_SIZE = 10;
        for (let i = 0; i < toiletIds.length; i += CHUNK_SIZE) {
          chunks.push(toiletIds.slice(i, i + CHUNK_SIZE));
        }

        for (const chunk of chunks) {
          const qBookings = query(
            collection(db, "bookings"),
            where("toiletId", "in", chunk)
          );
          const bookingsSnap = await getDocs(qBookings);

          bookingsSnap.forEach((doc) => {
            const booking = doc.data();
            totalBookings++;

            const bookingDate = new Date(booking.bookingTime);
            if (bookingDate >= today) todayBookings++;
            if (bookingDate >= monthStart) monthBookings++;

            if (
              booking.status === "completed" &&
              booking.paymentStatus === "paid"
            ) {
              const amount = booking.totalPrice || 0;
              totalRevenue += amount;
              if (bookingDate >= monthStart) monthRevenue += amount;
            }
          });
        }
      }

      setStats({
        totalLocations: toiletIds.length,
        activeLocations: activeCount,
        totalRooms,
        totalBookings,
        todayBookings,
        monthBookings,
        totalRevenue,
        monthRevenue,
        avgRating: totalReviews > 0 ? totalRating / toiletsSnap.size : 0,
        totalReviews,
      });
    } catch (error) {
      console.error("Lỗi fetch stats:", error);
      Alert.alert("Lỗi", "Không thể tải thống kê");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBusinessStats();
  };

  const handleUpdateProfile = async () => {
    if (!user || !newName.trim()) return;

    try {
      await updateProfile(user, { displayName: newName.trim() });
      Alert.alert("✅ Thành công", "Đã cập nhật tên hiển thị!");
      setEditModalVisible(false);
    } catch (error: any) {
      Alert.alert("❌ Lỗi", error.message);
    }
  };

  const handleLogout = () => {
    Alert.alert("Đăng xuất", "Bạn có chắc muốn đăng xuất?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: () => auth.signOut().then(() => router.replace("/login")),
      },
    ]);
  };

  const handleSeedData = async () => {
    if (!user?.email) return;

    Alert.alert(
      "Tạo dữ liệu mẫu",
      "Thao tác này sẽ tạo 10 địa điểm mẫu kèm phòng. Tiếp tục?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Tạo ngay",
          onPress: async () => {
            setSeeding(true);
            try {
              await seedDatabase(user.email!);
              Alert.alert(
                "✅ Thành công",
                "Đã tạo 10 địa điểm mẫu. Vui lòng vuốt xuống để làm mới."
              );
              fetchBusinessStats();
            } catch (error: any) {
              Alert.alert("❌ Lỗi", error.message);
            } finally {
              setSeeding(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Đang tải thống kê...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2196F3" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2196F3"]}
          />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.coverBanner}>
            <View style={styles.overlay} />
          </View>

          <View style={styles.profileContent}>
            <View style={styles.avatarContainer}>
              <Image
                source={{
                  uri:
                    user?.photoURL ||
                    `https://ui-avatars.com/api/?name=${user?.displayName}&background=2196F3&color=fff&size=128`,
                }}
                style={styles.avatarLarge}
              />
              <TouchableOpacity
                style={styles.editAvatarBtn}
                onPress={() => setEditModalVisible(true)}
              >
                <Ionicons name="create" size={16} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {user?.displayName || "Provider"}
              </Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              <View style={styles.businessBadge}>
                <Ionicons name="business" size={14} color="#2196F3" />
                <Text style={styles.businessBadgeText}>Đối tác Kinh doanh</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Business Stats Overview */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Tổng quan Kinh doanh</Text>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: "#E3F2FD" }]}>
              <Ionicons name="storefront" size={28} color="#2196F3" />
              <Text style={styles.statValue}>{stats.totalLocations}</Text>
              <Text style={styles.statLabel}>Địa điểm</Text>
              <Text style={styles.statSub}>
                {stats.activeLocations} hoạt động
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: "#E8F5E9" }]}>
              <Ionicons name="bed" size={28} color="#4CAF50" />
              <Text style={styles.statValue}>{stats.totalRooms}</Text>
              <Text style={styles.statLabel}>Phòng</Text>
              <Text style={styles.statSub}>Tổng số</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: "#FFF3E0" }]}>
              <Ionicons name="calendar" size={28} color="#FF9800" />
              <Text style={styles.statValue}>{stats.totalBookings}</Text>
              <Text style={styles.statLabel}>Lượt đặt</Text>
              <Text style={styles.statSub}>{stats.todayBookings} hôm nay</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: "#F3E5F5" }]}>
              <Ionicons name="cash" size={28} color="#9C27B0" />
              <Text style={styles.statValue}>
                {(stats.totalRevenue / 1000000).toFixed(1)}M
              </Text>
              <Text style={styles.statLabel}>Doanh thu</Text>
              <Text style={styles.statSub}>
                {(stats.monthRevenue / 1000).toFixed(0)}K tháng này
              </Text>
            </View>
          </View>

          <View style={styles.ratingCard}>
            <View style={styles.ratingLeft}>
              <Text style={styles.ratingValue}>
                {stats.avgRating.toFixed(1)}
              </Text>
              <View style={styles.starsRow}>
                {[...Array(5)].map((_, i) => (
                  <Ionicons
                    key={i}
                    name={
                      i < Math.round(stats.avgRating) ? "star" : "star-outline"
                    }
                    size={16}
                    color="#FBC02D"
                  />
                ))}
              </View>
            </View>
            <View style={styles.ratingRight}>
              <Text style={styles.ratingLabel}>Đánh giá trung bình</Text>
              <Text style={styles.reviewsCount}>
                Từ {stats.totalReviews} lượt đánh giá
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quản lý nhanh</Text>

          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push("/(tabs)/dashboard")}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#E3F2FD" }]}>
                <Ionicons name="pie-chart" size={24} color="#2196F3" />
              </View>
              <Text style={styles.actionTitle}>Dashboard</Text>
              <Text style={styles.actionSubtitle}>Tổng quan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push("/(tabs)/bookings")}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#E8F5E9" }]}>
                <Ionicons name="calendar" size={24} color="#4CAF50" />
              </View>
              <Text style={styles.actionTitle}>Đặt chỗ</Text>
              <Text style={styles.actionSubtitle}>
                {stats.todayBookings} mới
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push("/(tabs)/profile")}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#FFF3E0" }]}>
                <Ionicons name="add-circle" size={24} color="#FF9800" />
              </View>
              <Text style={styles.actionTitle}>Thêm mới</Text>
              <Text style={styles.actionSubtitle}>Địa điểm</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={handleSeedData}
              disabled={seeding}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#F3E5F5" }]}>
                {seeding ? (
                  <ActivityIndicator size="small" color="#9C27B0" />
                ) : (
                  <Ionicons name="construct" size={24} color="#9C27B0" />
                )}
              </View>
              <Text style={styles.actionTitle}>Data mẫu</Text>
              <Text style={styles.actionSubtitle}>Tạo nhanh</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Cài đặt</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setEditModalVisible(true)}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="person-outline" size={22} color="#666" />
              <Text style={styles.settingText}>Chỉnh sửa thông tin</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={22} color="#666" />
              <Text style={styles.settingText}>Thông báo</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="help-circle-outline" size={22} color="#666" />
              <Text style={styles.settingText}>Hỗ trợ</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, styles.logoutItem]}
            onPress={handleLogout}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="log-out-outline" size={22} color="#F44336" />
              <Text style={[styles.settingText, { color: "#F44336" }]}>
                Đăng xuất
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>Version 1.0.0 - Provider Edition</Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chỉnh sửa thông tin</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Tên hiển thị</Text>
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
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUpdateProfile}
                style={styles.confirmBtn}
              >
                <Text style={styles.confirmBtnText}>Lưu thay đổi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  loadingText: { marginTop: 10, color: "#666" },

  // Profile Header
  profileHeader: {
    backgroundColor: "white",
    marginBottom: 15,
  },
  coverBanner: {
    height: 120,
    backgroundColor: "#2196F3",
    position: "relative",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  profileContent: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  avatarContainer: {
    marginTop: -50,
    position: "relative",
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "white",
  },
  editAvatarBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#2196F3",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "white",
  },
  userInfo: {
    alignItems: "center",
    marginTop: 12,
  },
  userName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  userEmail: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  businessBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 10,
    gap: 6,
  },
  businessBadgeText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#2196F3",
  },

  // Sections
  statsSection: {
    backgroundColor: "white",
    padding: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  statSub: {
    fontSize: 10,
    color: "#999",
    marginTop: 2,
  },
  ratingCard: {
    flexDirection: "row",
    backgroundColor: "#FFF8E1",
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 10,
  },
  ratingLeft: {
    alignItems: "center",
    marginRight: 20,
  },
  ratingValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#F57C00",
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
    marginTop: 4,
  },
  ratingRight: {
    flex: 1,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  reviewsCount: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },

  // Actions
  actionsSection: {
    backgroundColor: "white",
    padding: 20,
    marginBottom: 15,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionCard: {
    width: "48%",
    backgroundColor: "#F9F9F9",
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 11,
    color: "#999",
  },

  // Settings
  settingsSection: {
    backgroundColor: "white",
    padding: 20,
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  settingText: {
    fontSize: 15,
    color: "#333",
  },
  logoutItem: {
    borderBottomWidth: 0,
    marginTop: 10,
  },

  versionText: {
    textAlign: "center",
    color: "#999",
    fontSize: 12,
    marginTop: 10,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: "#F9F9F9",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  cancelBtnText: {
    color: "#666",
    fontWeight: "bold",
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: "#2196F3",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmBtnText: {
    color: "white",
    fontWeight: "bold",
  },
});
