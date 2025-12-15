import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";
import { collection, getDocs, query, where } from "firebase/firestore";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { db } from "../../firebaseConfig";
import ToiletDetailModal from "../ToiletDetailModal";

// 👉 CẬP NHẬT BỘ LỌC CHI TIẾT HƠN
const FILTERS = [
  // Bỏ 'all' ra khỏi list để xử lý riêng hoặc coi rỗng là all
  { id: "hot_water", label: "Nước nóng", icon: "thermometer" },
  { id: "sauna", label: "Xông hơi", icon: "cloud" },
  { id: "locker", label: "Tủ đồ", icon: "lock-closed" },
  { id: "parking", label: "Gửi xe", icon: "bicycle" },
  { id: "accessible", label: "Xe lăn", icon: "accessibility" },
  { id: "wifi", label: "Wifi", icon: "wifi" },
  { id: "towel", label: "Khăn tắm", icon: "shirt" },
];

// 👉 DỮ LIỆU MOCK (Giả lập) - Rải rác khắp Sài Gòn
const MOCK_BATHHOUSES = [
  {
    id: "mock_1",
    name: "Phòng Tắm Công Cộng Tao Đàn",
    address: "Công viên Tao Đàn, Quận 1",
    latitude: 10.7745,
    longitude: 106.6923,
    price: 15000,
    rating: 4.2,
    ratingCount: 128,
    amenities: ["hot_water", "locker", "parking"],
    status: "approved",
    image: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600",
  },
  {
    id: "mock_2",
    name: "Bath Station Bình Thạnh",
    address: "15 Nguyễn Gia Trí, Bình Thạnh",
    latitude: 10.8019,
    longitude: 106.7113,
    price: 30000,
    rating: 4.8,
    ratingCount: 56,
    amenities: ["hot_water", "sauna", "locker", "parking", "wifi"],
    status: "approved",
    image: "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=600",
  },
  {
    id: "mock_3",
    name: "Nhà Tắm Tiện Lợi Q5",
    address: "Trần Hưng Đạo, Quận 5",
    latitude: 10.7537,
    longitude: 106.6718,
    price: 10000,
    rating: 3.9,
    ratingCount: 89,
    amenities: ["locker", "parking"],
    status: "approved",
    image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600",
  },
  {
    id: "mock_4",
    name: "Sauna & Bath Phú Nhuận",
    address: "Phan Xích Long, Phú Nhuận",
    latitude: 10.7981,
    longitude: 106.6852,
    price: 50000,
    rating: 5.0,
    ratingCount: 210,
    amenities: [
      "hot_water",
      "sauna",
      "massage",
      "locker",
      "parking",
      "wifi",
      "accessible",
    ],
    status: "approved",
    image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600",
  },
  {
    id: "mock_5",
    name: "WC & Shower Kênh Nhiêu Lộc",
    address: "Hoàng Sa, Quận 3",
    latitude: 10.7885,
    longitude: 106.6789,
    price: 0,
    rating: 3.5,
    ratingCount: 45,
    amenities: ["parking"],
    status: "approved",
    image: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600",
  },
  {
    id: "mock_6",
    name: "Nhà Tắm Bến Xe Miền Đông",
    address: "Đinh Bộ Lĩnh, Bình Thạnh",
    latitude: 10.8153,
    longitude: 106.7077,
    price: 20000,
    rating: 3.8,
    ratingCount: 302,
    amenities: ["hot_water", "locker", "shop", "charge"],
    status: "approved",
    image: "https://images.unsplash.com/photo-1620626011761-996317b8d101?w=600",
  },
  {
    id: "mock_7",
    name: "Luxury Bath Thảo Điền",
    address: "Xuân Thủy, Thảo Điền",
    latitude: 10.8064,
    longitude: 106.7324,
    price: 100000,
    rating: 4.9,
    ratingCount: 88,
    amenities: [
      "hot_water",
      "sauna",
      "massage",
      "locker",
      "parking",
      "wifi",
      "laundry",
    ],
    status: "approved",
    image: "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=600",
  },
  {
    id: "mock_8",
    name: "Trạm Tắm Sân Bay",
    address: "Trường Sơn, Tân Bình",
    latitude: 10.8123,
    longitude: 106.6631,
    price: 45000,
    rating: 4.5,
    ratingCount: 150,
    amenities: ["hot_water", "locker", "charge", "wifi"],
    status: "approved",
    image: "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=600",
  },
];

// Hàm tính khoảng cách
const getDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
};

const formatDistance = (meters: number) => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

export default function UserMap() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [allToilets, setAllToilets] = useState<any[]>([]);
  const [displayedToilets, setDisplayedToilets] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedWC, setSelectedWC] = useState<any>(null);
  // 👉 Đổi sang mảng để chọn nhiều
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<any>(null); // Lưu vị trí user

  // 👉 State cho tìm kiếm
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const getUserLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    let location = await Location.getCurrentPositionAsync({});
    setUserLocation(location);
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  };

  useEffect(() => {
    getUserLocation();
  }, []);

  const fetchToilets = async () => {
    try {
      const q = query(
        collection(db, "toilets"),
        where("status", "==", "approved")
      );
      const querySnapshot = await getDocs(q);
      const list: any[] = [];

      // Lấy dữ liệu thật từ Firebase
      querySnapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));

      // Gộp thêm dữ liệu giả (Mock Data)
      const combinedList = [...list, ...MOCK_BATHHOUSES];

      setAllToilets(combinedList);
      setDisplayedToilets(combinedList);
    } catch (error) {
      console.log(error);
      // Nếu lỗi mạng, vẫn hiện mock data
      setAllToilets(MOCK_BATHHOUSES);
      setDisplayedToilets(MOCK_BATHHOUSES);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchToilets();
    }, [])
  );

  // 👉 Logic lọc: Kết hợp Filter tiện ích + Search Text
  const applyCombinedFilters = (text: string, filters: string[]) => {
    let filtered = allToilets;

    // 1. Lọc theo tiện ích (AND logic)
    if (filters.length > 0) {
      filtered = filtered.filter((wc) => {
        if (!wc.amenities) return false;
        return filters.every((fId) => wc.amenities.includes(fId));
      });
    }

    // 2. Lọc theo từ khóa tìm kiếm (nếu có)
    if (text.trim()) {
      const normalizedText = text.toLowerCase();
      filtered = filtered.filter(
        (wc) =>
          (wc.name && wc.name.toLowerCase().includes(normalizedText)) ||
          (wc.address && wc.address.toLowerCase().includes(normalizedText))
      );
    }

    // 3. Tính khoảng cách nếu có vị trí user
    if (userLocation) {
      filtered = filtered
        .map((item) => ({
          ...item,
          distance: getDistance(
            userLocation.coords.latitude,
            userLocation.coords.longitude,
            item.latitude,
            item.longitude
          ),
        }))
        .sort((a, b) => a.distance - b.distance); // Sắp xếp gần nhất trước
    }

    // Cập nhật hiển thị map
    setDisplayedToilets(filtered);

    // Cập nhật kết quả tìm kiếm dropdown (chỉ khi đang gõ)
    if (text.trim()) {
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  };

  // Xử lý khi bấm nút Filter
  const handleFilter = (filterId: string) => {
    let newFilters = [...activeFilters];

    if (filterId === "all") {
      newFilters = [];
    } else {
      if (newFilters.includes(filterId)) {
        newFilters = newFilters.filter((id) => id !== filterId);
      } else {
        newFilters.push(filterId);
      }
    }

    setActiveFilters(newFilters);
    applyCombinedFilters(searchQuery, newFilters); // Gọi hàm lọc kết hợp
  };

  // Xử lý khi nhập text tìm kiếm
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    applyCombinedFilters(text, activeFilters); // Gọi hàm lọc kết hợp
  };

  // 👉 Chọn kết quả tìm kiếm
  const onSelectSearchResult = (wc: any) => {
    setSearchQuery("");
    setSearchResults([]);
    Keyboard.dismiss();

    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: wc.latitude,
          longitude: wc.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        1000
      );
    }

    setSelectedWC(wc);
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: 10.7769,
          longitude: 106.7009,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        {displayedToilets.map((wc) => (
          <Marker
            key={wc.id}
            coordinate={{
              latitude: wc.latitude || 10,
              longitude: wc.longitude || 106,
            }}
            title={wc.name}
            // Logic màu pin: Free = Xanh lá, Có phí = Xanh dương
            pinColor={wc.price === 0 ? "#4CAF50" : "#039BE5"}
            onCalloutPress={() => {
              setSelectedWC(wc);
              setModalVisible(true);
            }}
          />
        ))}
      </MapView>

      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Ionicons
            name="search"
            size={20}
            color="#666"
            style={{ marginRight: 10 }}
          />
          <TextInput
            placeholder="Tìm nhà tắm, spa, phòng thay đồ..."
            style={styles.input}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch("")}>
              <Ionicons name="close-circle" size={20} color="#ccc" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.listButton}
          onPress={() => router.push("/(tabs)/explore")}
        >
          <Ionicons name="list" size={20} color="#333" />
        </TouchableOpacity>
      </View>

      {/* 👉 DANH SÁCH KẾT QUẢ TÌM KIẾM (Dropdown có Distance) */}
      {searchResults.length > 0 && (
        <View style={styles.searchResultsContainer}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 250 }}
          >
            {searchResults.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.resultItem}
                onPress={() => onSelectSearchResult(item)}
              >
                <View style={styles.resultIcon}>
                  <Ionicons name="location" size={20} color="#039BE5" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultTitle}>{item.name}</Text>
                  <View style={styles.resultMeta}>
                    <Text style={styles.resultDistance}>
                      {item.distance ? formatDistance(item.distance) : "..."}
                    </Text>
                    <Text style={styles.resultAddress} numberOfLines={1}>
                      {" "}
                      • {item.address}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
        >
          {/* Nút Tất cả */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              activeFilters.length === 0 && styles.filterChipActive,
            ]}
            onPress={() => handleFilter("all")}
          >
            <Ionicons
              name="apps"
              size={16}
              color={activeFilters.length === 0 ? "white" : "#555"}
            />
            <Text
              style={[
                styles.filterText,
                activeFilters.length === 0 && styles.filterTextActive,
              ]}
            >
              Gần tôi
            </Text>
          </TouchableOpacity>

          {/* Các nút filter khác */}
          {FILTERS.map((f) => {
            const isActive = activeFilters.includes(f.id);
            return (
              <TouchableOpacity
                key={f.id}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => handleFilter(f.id)}
              >
                <Ionicons
                  name={f.icon as any}
                  size={16}
                  color={isActive ? "white" : "#555"}
                />
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

      <TouchableOpacity style={styles.myLocationBtn} onPress={getUserLocation}>
        <Ionicons name="locate" size={24} color="#039BE5" />
      </TouchableOpacity>

      <ToiletDetailModal
        visible={modalVisible}
        toilet={selectedWC}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: "100%", height: "100%" },

  searchWrapper: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    zIndex: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 50,
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  input: { flex: 1, fontSize: 16 },
  listButton: {
    backgroundColor: "white",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  // Style cho kết quả tìm kiếm (Dropdown)
  searchResultsContainer: {
    position: "absolute",
    top: 105, // Ngay dưới thanh search
    left: 20,
    right: 20,
    backgroundColor: "white",
    borderRadius: 15,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 20, // Đè lên filter
    overflow: "hidden",
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  resultIcon: {
    marginRight: 12,
    width: 30,
    alignItems: "center",
  },
  resultTitle: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#333",
  },
  resultMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  resultDistance: {
    fontSize: 12,
    color: "#039BE5",
    fontWeight: "bold",
  },
  resultAddress: {
    fontSize: 12,
    color: "#666",
    flex: 1,
  },

  filterWrapper: { position: "absolute", top: 110, width: "100%", height: 40 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 3,
    gap: 5,
  },
  filterChipActive: { backgroundColor: "#039BE5" },
  filterText: { fontWeight: "600", color: "#555", fontSize: 13 },
  filterTextActive: { color: "white" },

  myLocationBtn: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
