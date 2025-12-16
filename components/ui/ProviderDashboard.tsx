import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  GeoPoint,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import QRCode from "react-native-qrcode-svg";
import { auth, db } from "../../firebaseConfig";

import RoomManagement from "./RoomManagement";

interface Toilet {
  id: string;
  name: string;
  address: string;
  price: number;
  status: string;
  rating: number;
  ratingCount: number;
  amenities: string[];
  location?: { latitude: number; longitude: number };
}

interface Stats {
  total: number;
  approved: number;
  pending: number;
  totalRevenue: number;
  todayBookings: number;
  activeBookings: number;
  totalRooms: number;
}

const AMENITIES_LIST = [
  { id: "hot_water", label: "Nước nóng", icon: "thermometer" },
  { id: "sauna", label: "Xông hơi", icon: "cloud" },
  { id: "locker", label: "Tủ đồ", icon: "lock-closed" },
  { id: "parking", label: "Gửi xe", icon: "bicycle" },
  { id: "accessible", label: "Xe lăn", icon: "accessibility" },
  { id: "wifi", label: "Wifi", icon: "wifi" },
  { id: "towel", label: "Khăn tắm", icon: "shirt" },
];

export default function ProviderDashboard() {
  const router = useRouter();
  const user = auth.currentUser;

  const mapRef = useRef<MapView>(null);
  // FIX: Dùng useRef để quản lý listener, tránh memory leak khi re-render
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myToilets, setMyToilets] = useState<Toilet[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    approved: 0,
    pending: 0,
    totalRevenue: 0,
    todayBookings: 0,
    activeBookings: 0,
    totalRooms: 0,
  });

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [roomManagementVisible, setRoomManagementVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);

  const [selectedManagementToiletId, setSelectedManagementToiletId] = useState<
    string | null
  >(null);
  const [editingToilet, setEditingToilet] = useState<Toilet | null>(null);
  const [selectedQRToilet, setSelectedQRToilet] = useState<Toilet | null>(null);

  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editAddress, setEditAddress] = useState("");

  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newAmenities, setNewAmenities] = useState<string[]>([]);
  const [newLocation, setNewLocation] = useState<Region>({
    latitude: 10.762622,
    longitude: 106.660172,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });

  useEffect(() => {
    fetchDashboardData();

    // FIX: Cleanup function quan trọng!
    // Sẽ chạy khi component unmount hoặc user thay đổi, hủy listener cũ đi.
    return () => {
      if (unsubscribeRef.current) {
        console.log("Cleaning up ProviderDashboard listener...");
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [user]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Permission to access location was denied");
      }
    })();
  }, []);

  const fetchDashboardData = async () => {
    if (!user) return;

    // FIX: Hủy listener cũ trước khi tạo cái mới (tránh trùng lặp)
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    try {
      if (!refreshing) setLoading(true);

      const qToilets = query(
        collection(db, "toilets"),
        where("createdBy", "==", user.email)
      );

      // FIX: Gán listener vào ref
      const unsub = onSnapshot(
        qToilets,
        async (snapshot) => {
          const list: Toilet[] = [];
          let approved = 0,
            pending = 0;

          snapshot.forEach((doc) => {
            const data = doc.data() as any;
            list.push({
              id: doc.id,
              name: data.name,
              address: data.address,
              price: data.price || 0,
              status: data.status,
              rating: data.rating || 5.0,
              ratingCount: data.ratingCount || 0,
              amenities: data.amenities || [],
              location: data.location
                ? {
                    latitude: data.location.latitude,
                    longitude: data.location.longitude,
                  }
                : undefined,
            });

            if (data.status === "approved") approved++;
            else pending++;
          });

          setMyToilets(list);
          // Hàm này nặng, nhưng cần thiết để cập nhật số liệu
          await fetchAdditionalStats(list, approved, pending);

          setLoading(false);
          setRefreshing(false);
        },
        (error) => {
          console.error("Lỗi Realtime Listener:", error);
          Alert.alert(
            "Lỗi kết nối",
            "Không thể cập nhật dữ liệu thời gian thực."
          );
          setLoading(false);
          setRefreshing(false);
        }
      );

      unsubscribeRef.current = unsub;
    } catch (error) {
      console.error("Lỗi fetch dashboard:", error);
      Alert.alert("Lỗi", "Không thể tải dữ liệu");
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAdditionalStats = async (
    toiletList: Toilet[],
    approved: number,
    pending: number
  ) => {
    try {
      const toiletIds = toiletList.map((t) => t.id);

      if (toiletIds.length === 0) {
        setStats({
          total: 0,
          approved: 0,
          pending: 0,
          totalRevenue: 0,
          todayBookings: 0,
          activeBookings: 0,
          totalRooms: 0,
        });
        return;
      }

      const chunks = [];
      const CHUNK_SIZE = 10;
      for (let i = 0; i < toiletIds.length; i += CHUNK_SIZE) {
        chunks.push(toiletIds.slice(i, i + CHUNK_SIZE));
      }

      let todayBookings = 0;
      let activeBookings = 0;
      let totalRevenue = 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const chunk of chunks) {
        const qBookings = query(
          collection(db, "bookings"),
          where("toiletId", "in", chunk)
        );
        const snapBookings = await getDocs(qBookings);

        snapBookings.forEach((doc) => {
          const booking = doc.data();
          const bookingDate = new Date(booking.bookingTime);
          if (bookingDate >= today) {
            todayBookings++;
          }
          if (["pending", "confirmed", "checked_in"].includes(booking.status)) {
            activeBookings++;
          }
          if (
            booking.status === "completed" &&
            booking.paymentStatus === "paid"
          ) {
            totalRevenue += booking.totalPrice || 0;
          }
        });
      }

      let totalRooms = 0;
      for (const chunk of chunks) {
        const qRooms = query(
          collection(db, "rooms"),
          where("toiletId", "in", chunk)
        );
        const snapRooms = await getDocs(qRooms);
        totalRooms += snapRooms.size;
      }

      setStats({
        total: toiletList.length,
        approved,
        pending,
        totalRevenue,
        todayBookings,
        activeBookings,
        totalRooms,
      });
    } catch (error) {
      console.error("Lỗi fetch stats:", error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // --- LOCATION HELPERS ---
  const handleGetCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Quyền truy cập",
          "Cần quyền truy cập vị trí để sử dụng tính năng này."
        );
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };

      setNewLocation(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
    } catch (error) {
      Alert.alert("Lỗi", "Không thể lấy vị trí hiện tại.");
    }
  };

  const handleGeocodeAddress = async () => {
    if (!newAddress) {
      Alert.alert("Chưa nhập địa chỉ", "Vui lòng nhập địa chỉ để tìm kiếm.");
      return;
    }
    try {
      let geocodedLocation = await Location.geocodeAsync(newAddress);
      if (geocodedLocation.length > 0) {
        const { latitude, longitude } = geocodedLocation[0];
        const newRegion = {
          latitude,
          longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        };
        setNewLocation(newRegion);
        mapRef.current?.animateToRegion(newRegion, 1000);
      } else {
        Alert.alert(
          "Không tìm thấy",
          "Không thể tìm thấy vị trí cho địa chỉ này."
        );
      }
    } catch (error) {
      Alert.alert("Lỗi", "Có lỗi xảy ra khi tìm kiếm địa chỉ.");
    }
  };

  // --- CRUD Operations ---
  const handleAddNewFacility = async () => {
    if (!newName || !newAddress || !newPrice) {
      Alert.alert(
        "Thiếu thông tin",
        "Vui lòng nhập đầy đủ tên, địa chỉ và giá."
      );
      return;
    }

    try {
      await addDoc(collection(db, "toilets"), {
        name: newName.trim(),
        address: newAddress.trim(),
        price: Number(newPrice),
        createdBy: user?.email,
        status: "pending",
        rating: 5.0,
        ratingCount: 0,
        amenities: newAmenities,
        createdAt: new Date().toISOString(),
        location: new GeoPoint(newLocation.latitude, newLocation.longitude),
      });

      Alert.alert("✅ Thành công", "Đã thêm địa điểm mới!");
      setAddModalVisible(false);

      setNewName("");
      setNewAddress("");
      setNewPrice("");
      setNewAmenities([]);
    } catch (error: any) {
      Alert.alert("❌ Lỗi", error.message);
    }
  };

  const toggleAmenity = (id: string) => {
    if (newAmenities.includes(id)) {
      setNewAmenities(newAmenities.filter((item) => item !== id));
    } else {
      setNewAmenities([...newAmenities, id]);
    }
  };

  const handleEdit = (item: Toilet) => {
    setEditingToilet(item);
    setEditName(item.name);
    setEditPrice(String(item.price));
    setEditAddress(item.address);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingToilet) return;

    try {
      await updateDoc(doc(db, "toilets", editingToilet.id), {
        name: editName.trim(),
        price: Number(editPrice),
        address: editAddress.trim(),
        updatedAt: new Date().toISOString(),
      });

      Alert.alert("✅ Thành công", "Đã cập nhật thông tin!");
      setEditModalVisible(false);
    } catch (error: any) {
      Alert.alert("❌ Lỗi", error.message);
    }
  };

  const handleDelete = (item: Toilet) => {
    Alert.alert(
      "⚠️ Xác nhận xóa",
      `Xóa "${item.name}"?\n\nCảnh báo: Thao tác này không thể hoàn tác!`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "toilets", item.id));
              const qRooms = query(
                collection(db, "rooms"),
                where("toiletId", "==", item.id)
              );
              const roomsSnap = await getDocs(qRooms);
              const deletePromises = roomsSnap.docs.map((d) =>
                deleteDoc(d.ref)
              );
              await Promise.all(deletePromises);
              Alert.alert("✅ Đã xóa", "Địa điểm đã được xóa khỏi hệ thống");
            } catch (error: any) {
              Alert.alert("❌ Lỗi", error.message);
            }
          },
        },
      ]
    );
  };

  const handleShowQR = (item: Toilet) => {
    setSelectedQRToilet(item);
    setQrModalVisible(true);
  };

  const handleManageRooms = (item: Toilet) => {
    setSelectedManagementToiletId(item.id);
    setRoomManagementVisible(true);
  };

  const navigateToBookings = () => {
    router.push("/(tabs)/bookings");
  };

  const renderToiletItem = ({ item }: { item: Toilet }) => (
    <View style={styles.card}>
      <TouchableOpacity
        style={{ flex: 1 }}
        onPress={() => handleManageRooms(item)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  item.status === "approved" ? "#E8F5E9" : "#FFF3E0",
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: item.status === "approved" ? "#4CAF50" : "#FF9800" },
              ]}
            >
              {item.status === "approved" ? "✓ Hoạt động" : "⏳ Chờ duyệt"}
            </Text>
          </View>
        </View>

        <Text style={styles.cardAddress} numberOfLines={1}>
          📍 {item.address}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={styles.priceText}>
            {item.price === 0 ? "Miễn phí" : `${item.price.toLocaleString()}đ`}
          </Text>
          <View style={styles.ratingBox}>
            <Ionicons name="star" size={12} color="#FBC02D" />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({item.ratingCount})</Text>
          </View>
        </View>
        {item.amenities && item.amenities.length > 0 && (
          <View style={styles.amenitiesRowMini}>
            {item.amenities.slice(0, 4).map((key) => {
              const am = AMENITIES_LIST.find((a) => a.id === key);
              if (!am) return null;
              return (
                <Ionicons
                  key={key}
                  name={am.icon as any}
                  size={12}
                  color="#999"
                  style={{ marginRight: 4 }}
                />
              );
            })}
            {item.amenities.length > 4 && (
              <Text style={{ fontSize: 10, color: "#999" }}>...</Text>
            )}
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.actionColumn}>
        <TouchableOpacity
          onPress={() => handleManageRooms(item)}
          style={styles.iconBtn}
        >
          <Ionicons name="bed" size={18} color="#2196F3" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleShowQR(item)}
          style={styles.iconBtn}
        >
          <Ionicons name="qr-code" size={18} color="#4CAF50" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleEdit(item)}
          style={styles.iconBtn}
        >
          <Ionicons name="create" size={18} color="#FF9800" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleDelete(item)}
          style={styles.iconBtn}
        >
          <Ionicons name="trash" size={18} color="#F44336" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={myToilets}
        renderItem={renderToiletItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2196F3"]}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Dashboard Kinh Doanh</Text>
              <TouchableOpacity
                onPress={() => setAddModalVisible(true)}
                style={styles.addBtn}
              >
                <Ionicons name="add-circle" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.statsSection}>
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: "#E3F2FD" }]}>
                  <Ionicons name="business" size={24} color="#2196F3" />
                  <Text style={styles.statValue}>{stats.total}</Text>
                  <Text style={styles.statLabel}>Địa điểm</Text>
                </View>

                <View style={[styles.statCard, { backgroundColor: "#E8F5E9" }]}>
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                  <Text style={styles.statValue}>{stats.approved}</Text>
                  <Text style={styles.statLabel}>Đã duyệt</Text>
                </View>

                <View style={[styles.statCard, { backgroundColor: "#FFF3E0" }]}>
                  <Ionicons name="time" size={24} color="#FF9800" />
                  <Text style={styles.statValue}>{stats.pending}</Text>
                  <Text style={styles.statLabel}>Chờ duyệt</Text>
                </View>
              </View>

              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: "#F3E5F5" }]}>
                  <Ionicons name="cash" size={24} color="#9C27B0" />
                  <Text style={styles.statValue}>
                    {(stats.totalRevenue / 1000).toFixed(0)}K
                  </Text>
                  <Text style={styles.statLabel}>Doanh thu</Text>
                </View>

                <View style={[styles.statCard, { backgroundColor: "#E0F2F1" }]}>
                  <Ionicons name="calendar" size={24} color="#00796B" />
                  <Text style={styles.statValue}>{stats.todayBookings}</Text>
                  <Text style={styles.statLabel}>Hôm nay</Text>
                </View>

                <View style={[styles.statCard, { backgroundColor: "#FFEBEE" }]}>
                  <Ionicons name="people" size={24} color="#C62828" />
                  <Text style={styles.statValue}>{stats.activeBookings}</Text>
                  <Text style={styles.statLabel}>Đang hoạt động</Text>
                </View>
              </View>

              <View style={styles.quickActions}>
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={navigateToBookings}
                >
                  <Ionicons name="calendar-outline" size={28} color="#2196F3" />
                  <Text style={styles.actionText}>Quản lý đặt chỗ</Text>
                  {stats.activeBookings > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {stats.activeBookings}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => setAddModalVisible(true)}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={28}
                    color="#4CAF50"
                  />
                  <Text style={styles.actionText}>Thêm địa điểm</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => {
                    setSelectedManagementToiletId(null);
                    setRoomManagementVisible(true);
                  }}
                >
                  <Ionicons name="bed-outline" size={28} color="#9C27B0" />
                  <Text style={styles.actionText}>Quản lý phòng</Text>
                  {stats.totalRooms > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{stats.totalRooms}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Địa điểm của tôi ({myToilets.length})
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="storefront-outline" size={80} color="#E0E0E0" />
            <Text style={styles.emptyTitle}>Chưa có địa điểm nào</Text>
            <Text style={styles.emptySubtitle}>
              Thêm địa điểm đầu tiên để bắt đầu kinh doanh!
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => setAddModalVisible(true)}
            >
              <Ionicons name="add-circle" size={24} color="white" />
              <Text style={styles.emptyBtnText}>Thêm ngay</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      <Modal visible={addModalVisible} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "95%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm Địa Điểm Mới</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Tên địa điểm</Text>
              <TextInput
                style={styles.input}
                value={newName}
                onChangeText={setNewName}
                placeholder="Ví dụ: WC Công Cộng A1"
              />

              <Text style={styles.inputLabel}>Địa chỉ hiển thị</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={newAddress}
                  onChangeText={setNewAddress}
                  placeholder="Số 123, Đường ABC..."
                />
                <TouchableOpacity
                  style={styles.searchLocationBtn}
                  onPress={handleGeocodeAddress}
                >
                  <Ionicons name="search" size={24} color="white" />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Giá vé cơ bản (VNĐ)</Text>
              <TextInput
                style={styles.input}
                value={newPrice}
                onChangeText={setNewPrice}
                placeholder="5000"
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Tiện ích & Dịch vụ</Text>
              <View style={styles.amenitiesContainer}>
                {AMENITIES_LIST.map((item) => {
                  const isSelected = newAmenities.includes(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.amenityChip,
                        isSelected && styles.amenityChipActive,
                      ]}
                      onPress={() => toggleAmenity(item.id)}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={16}
                        color={isSelected ? "white" : "#666"}
                      />
                      <Text
                        style={[
                          styles.amenityText,
                          isSelected && styles.amenityTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>
                Vị trí chính xác (Kéo bản đồ)
              </Text>
              <View style={styles.mapContainer}>
                <MapView
                  ref={mapRef}
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  initialRegion={newLocation}
                  onRegionChangeComplete={(region) => setNewLocation(region)}
                >
                  <Marker
                    coordinate={{
                      latitude: newLocation.latitude,
                      longitude: newLocation.longitude,
                    }}
                    title="Vị trí địa điểm"
                  />
                </MapView>

                <View style={styles.mapCrosshair}>
                  <Ionicons name="add" size={30} color="#2196F3" />
                </View>

                <TouchableOpacity
                  style={styles.locateMeBtn}
                  onPress={handleGetCurrentLocation}
                >
                  <Ionicons name="locate" size={24} color="#2196F3" />
                </TouchableOpacity>
              </View>
              <Text style={styles.coordsText}>
                Lat: {newLocation.latitude.toFixed(6)}, Lng:{" "}
                {newLocation.longitude.toFixed(6)}
              </Text>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  onPress={() => setAddModalVisible(false)}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelBtnText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAddNewFacility}
                  style={styles.confirmBtn}
                >
                  <Text style={styles.confirmBtnText}>Tạo Địa Điểm</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chỉnh sửa thông tin</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Tên địa điểm</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Tên địa điểm"
            />
            <Text style={styles.inputLabel}>Địa chỉ</Text>
            <TextInput
              style={styles.input}
              value={editAddress}
              onChangeText={setEditAddress}
              placeholder="Địa chỉ"
            />
            <Text style={styles.inputLabel}>Giá vé</Text>
            <TextInput
              style={styles.input}
              value={editPrice}
              onChangeText={setEditPrice}
              placeholder="Giá vé (VNĐ)"
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEdit}
                style={styles.confirmBtn}
              >
                <Text style={styles.confirmBtnText}>Lưu thay đổi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={qrModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mã QR Check-in</Text>
              <TouchableOpacity onPress={() => setQrModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.qrSubtitle}>
              In và dán mã này tại quầy để khách check-in
            </Text>

            {selectedQRToilet && (
              <View style={styles.qrWrapper}>
                <QRCode
                  value={`STORE_${selectedQRToilet.id}`}
                  size={220}
                  logoBackgroundColor="transparent"
                />
              </View>
            )}

            <Text style={styles.storeName}>{selectedQRToilet?.name}</Text>
            <Text style={styles.storeId}>
              ID: STORE_{selectedQRToilet?.id.slice(0, 8).toUpperCase()}
            </Text>

            <TouchableOpacity
              style={styles.printBtn}
              onPress={() =>
                Alert.alert("Thông báo", "Vui lòng chụp màn hình để in mã QR")
              }
            >
              <Ionicons name="print" size={20} color="white" />
              <Text style={styles.printBtnText}>Hướng dẫn in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={roomManagementVisible}
        animationType="slide"
        onRequestClose={() => {
          setRoomManagementVisible(false);
          setSelectedManagementToiletId(null);
        }}
      >
        <RoomManagement
          onClose={() => {
            setRoomManagementVisible(false);
            setSelectedManagementToiletId(null);
          }}
          initialToiletId={selectedManagementToiletId}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
  },
  loadingText: { marginTop: 10, color: "#666", fontSize: 14 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#2196F3",
    padding: 20,
    paddingTop: 60,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "white" },
  addBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 25,
    padding: 8,
  },
  statsSection: { padding: 20 },
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
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 8,
  },
  statLabel: { fontSize: 11, color: "#666", marginTop: 4 },
  quickActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "white",
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
    elevation: 2,
    position: "relative",
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    marginTop: 8,
    textAlign: "center",
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#F44336",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
  },
  badgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  listContent: { paddingBottom: 20 },
  card: {
    flexDirection: "row",
    backgroundColor: "white",
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 15,
    borderRadius: 16,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: "#2196F3",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: { fontSize: 10, fontWeight: "bold" },
  cardAddress: {
    fontSize: 13,
    color: "#666",
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2196F3",
  },
  ratingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#333",
  },
  reviewCount: { fontSize: 12, color: "#999" },
  amenitiesRowMini: {
    flexDirection: "row",
    marginTop: 8,
    alignItems: "center",
  },
  actionColumn: {
    justifyContent: "space-around",
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: "#f0f0f0",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 30,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2196F3",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  emptyBtnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
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
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#F9F9F9",
  },
  searchLocationBtn: {
    backgroundColor: "#2196F3",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 15,
  },
  amenitiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 5,
  },
  amenityChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    gap: 6,
  },
  amenityChipActive: {
    backgroundColor: "#2196F3",
    borderColor: "#2196F3",
  },
  amenityText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  amenityTextActive: {
    color: "white",
    fontWeight: "bold",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
    marginBottom: 10,
  },
  cancelBtn: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  cancelBtnText: { color: "#666", fontWeight: "bold" },
  confirmBtn: {
    flex: 1,
    backgroundColor: "#2196F3",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmBtnText: { color: "white", fontWeight: "bold" },
  mapContainer: {
    height: 250,
    borderRadius: 16,
    overflow: "hidden",
    marginVertical: 10,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  mapCrosshair: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -15,
    marginLeft: -15,
    pointerEvents: "none",
  },
  locateMeBtn: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "white",
    padding: 10,
    borderRadius: 25,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  coordsText: {
    textAlign: "center",
    fontSize: 11,
    color: "#999",
    fontFamily: "monospace",
  },
  qrModalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    maxWidth: 360,
  },
  qrSubtitle: {
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  qrWrapper: {
    padding: 20,
    backgroundColor: "white",
    borderRadius: 16,
    elevation: 5,
    marginBottom: 20,
  },
  storeName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 5,
  },
  storeId: {
    fontSize: 12,
    color: "#999",
    fontFamily: "monospace",
    marginBottom: 20,
  },
  printBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2196F3",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    gap: 8,
  },
  printBtnText: {
    color: "white",
    fontWeight: "bold",
  },
});
