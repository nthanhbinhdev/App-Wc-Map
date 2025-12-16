import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../firebaseConfig";
import ToiletDetailModal from "../ToiletDetailModal";

// --- CÁC HÀM TIỆN ÍCH ---
const getDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const formatDistance = (meters: number) => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

const openMaps = (lat: number, lng: number, label: string) => {
  const scheme = Platform.select({ ios: "maps:0,0?q=", android: "geo:0,0?q=" });
  const latLng = `${lat},${lng}`;
  const labelEncoded = encodeURIComponent(label);
  const url = Platform.select({
    ios: `${scheme}${labelEncoded}@${latLng}`,
    android: `${scheme}${latLng}(${labelEncoded})`,
  });
  Linking.openURL(
    url || `http://googleusercontent.com/maps.google.com/maps?q=${lat},${lng}`
  );
};

// Kiểm tra giờ mở cửa (Giả sử 05:30 - 23:00)
const isOpenNow = () => {
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  return currentHour >= 5.5 && currentHour <= 23;
};

// 👉 CẤU HÌNH BỘ LỌC
const FILTER_OPTIONS = [
  { id: "sort_distance", label: "Gần tôi", type: "sort" },
  { id: "filter_available", label: "Còn phòng", type: "filter" },
  { id: "sort_price", label: "Giá tốt", type: "sort" },
  { id: "sort_rating", label: "Đánh giá cao", type: "sort" },
  { id: "filter_free", label: "Miễn phí", type: "filter" },
  { id: "filter_hot_water", label: "Nước nóng", type: "filter" },
  { id: "filter_wifi", label: "Wifi Free", type: "filter" },
  { id: "filter_parking", label: "Giữ xe", type: "filter" },
  { id: "filter_hair_dryer", label: "Máy sấy", type: "filter" },
];

export default function ToiletList() {
  const [toilets, setToilets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedWC, setSelectedWC] = useState<any>(null);

  // 👉 GỘP CHUNG: Lưu cả tên và SĐT vào 1 chỗ cho gọn
  const [userInfo, setUserInfo] = useState({ name: "", phone: "" });

  // 👉 STATE QUẢN LÝ BỘ LỌC
  const [activeSort, setActiveSort] = useState("sort_distance");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  // 1. Lấy vị trí hiện tại
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation(loc);
      }
    })();
  }, []);

  // 2. Tự động lấy Info User (Tên + SĐT) khi đã đăng nhập
  useEffect(() => {
    // Dùng onAuthStateChanged để chắc chắn Auth đã sẵn sàng
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        let name = user.displayName || "";
        let phone = user.phoneNumber || "";

        try {
          // Lấy thêm từ Firestore (để lấy SĐT nếu Auth chưa có)
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            // Ưu tiên dữ liệu trong Firestore
            name = data.name || data.displayName || name;
            phone = data.phone || data.phoneNumber || phone;
          }
        } catch (e) {
          console.log("Lỗi lấy info user:", e);
        }

        // Cập nhật state một lần duy nhất
        setUserInfo({ name, phone });
      }
    });

    return () => unsubscribe();
  }, []);

  // 3. Lấy danh sách Toilets Realtime
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, "toilets"),
      where("status", "==", "approved")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();

        let lat = 0;
        let lng = 0;

        if (data.location && typeof data.location.latitude === "number") {
          lat = data.location.latitude;
          lng = data.location.longitude;
        } else if (data.latitude && data.longitude) {
          lat = data.latitude;
          lng = data.longitude;
        }

        list.push({
          id: doc.id,
          ...data,
          rawLat: lat,
          rawLng: lng,
        });
      });
      setToilets(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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

  const processedToilets = useMemo(() => {
    let list = toilets.map((item) => {
      let dist = 0;
      if (userLocation) {
        dist = getDistance(
          userLocation.coords.latitude,
          userLocation.coords.longitude,
          item.rawLat,
          item.rawLng
        );
      }
      return { ...item, distance: dist };
    });

    if (activeFilters.length > 0) {
      list = list.filter((item) => {
        for (const filterId of activeFilters) {
          if (filterId === "filter_available") {
            if (!isOpenNow()) return false;
          }
          if (filterId === "filter_free") {
            if (Number(item.price) !== 0) return false;
          }
          if (
            filterId.startsWith("filter_") &&
            !["filter_available", "filter_free"].includes(filterId)
          ) {
            const amenityKey = filterId.replace("filter_", "");
            if (!item.amenities || !item.amenities.includes(amenityKey))
              return false;
          }
        }
        return true;
      });
    }

    switch (activeSort) {
      case "sort_price":
        return list.sort((a, b) => Number(a.price) - Number(b.price));
      case "sort_rating":
        return list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case "sort_distance":
      default:
        return list.sort((a, b) => a.distance - b.distance);
    }
  }, [toilets, userLocation, activeSort, activeFilters]);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        setSelectedWC(item);
        setModalVisible(true);
      }}
    >
      <View style={styles.cardContent}>
        <View style={styles.topRow}>
          <View style={{ flex: 1, marginRight: 5 }}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.name}
            </Text>
          </View>
          <View style={styles.ratingBox}>
            <Text style={styles.ratingText}>
              {Number(item.rating || 5).toFixed(1)}
            </Text>
            <Ionicons name="star" size={10} color="white" />
          </View>
        </View>
        <View style={styles.addressRow}>
          <Ionicons
            name="location-outline"
            size={14}
            color="#888"
            style={{ marginTop: 2 }}
          />
          <Text style={styles.cardAddress} numberOfLines={2}>
            {item.address}
          </Text>
        </View>
        <View style={styles.dashedLine} />
        <View style={styles.footerRow}>
          <View>
            <Text
              style={[
                styles.cardPrice,
                { color: item.price === 0 ? "#4CAF50" : "#0288D1" },
              ]}
            >
              {item.price === 0
                ? "MIỄN PHÍ"
                : `${Number(item.price).toLocaleString()}đ`}
            </Text>
            <View style={styles.distanceBadge}>
              <Ionicons name="walk" size={12} color="#FF5722" />
              <Text style={styles.distanceText}>
                {item.distance > 0 ? formatDistance(item.distance) : "? km"}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.navigateBtn}
            onPress={() => openMaps(item.rawLat, item.rawLng, item.name)}
          >
            <Ionicons name="arrow-redo" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Địa điểm tắm gần bạn</Text>
      </View>

      <View style={{ marginBottom: 10 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {FILTER_OPTIONS.map((f) => {
            const isActive =
              activeSort === f.id || activeFilters.includes(f.id);

            return (
              <TouchableOpacity
                key={f.id}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
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

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#0288D1"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={processedToilets}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={styles.columnWrapper}
          ListEmptyComponent={
            <View
              style={{
                alignItems: "center",
                marginTop: 50,
                paddingHorizontal: 40,
              }}
            >
              <Ionicons name="search-outline" size={60} color="#E0E0E0" />
              <Text
                style={{
                  textAlign: "center",
                  marginTop: 15,
                  color: "gray",
                  fontSize: 16,
                }}
              >
                Không tìm thấy địa điểm nào khớp với bộ lọc của bạn...
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setActiveFilters([]);
                  setActiveSort("sort_distance");
                }}
                style={{ marginTop: 20 }}
              >
                <Text style={{ color: "#0288D1", fontWeight: "bold" }}>
                  Xóa bộ lọc
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* 👇 Cập nhật: Truyền cả tên và sđt xuống modal */}
      <ToiletDetailModal
        visible={modalVisible}
        toilet={selectedWC}
        onClose={() => setModalVisible(false)}
        initialName={userInfo.name}
        initialPhone={userInfo.phone}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F4F8", paddingTop: 50 },
  header: { paddingHorizontal: 20, marginBottom: 10 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#1A1A1A" },

  filterContainer: { paddingHorizontal: 20, paddingBottom: 5 },
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
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  filterChipActive: {
    backgroundColor: "#0288D1",
    borderColor: "#0288D1",
    elevation: 3,
  },
  filterText: { fontSize: 13, fontWeight: "600", color: "#555" },
  filterTextActive: { color: "white" },

  listContainer: { paddingHorizontal: 12, paddingBottom: 20 },
  columnWrapper: { justifyContent: "space-between" },
  card: {
    backgroundColor: "white",
    width: "48%",
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: "#6DA0C9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "white",
  },
  cardContent: { padding: 12, flex: 1, justifyContent: "space-between" },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#333", lineHeight: 20 },
  ratingBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FBC02D",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  ratingText: {
    fontSize: 10,
    color: "white",
    fontWeight: "bold",
    marginRight: 2,
  },
  addressRow: { flexDirection: "row", marginBottom: 10 },
  cardAddress: { fontSize: 12, color: "#666", marginLeft: 4, flex: 1 },
  dashedLine: {
    height: 1,
    backgroundColor: "#EEE",
    marginVertical: 8,
    width: "100%",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardPrice: { fontSize: 13, fontWeight: "900", marginBottom: 4 },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF0E6",
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#FF5722",
    marginLeft: 3,
  },
  navigateBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0288D1",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0288D1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
});
