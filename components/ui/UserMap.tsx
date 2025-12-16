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
  { id: "hot_water", label: "Nước nóng", icon: "thermometer" },
  { id: "sauna", label: "Xông hơi", icon: "cloud" },
  { id: "locker", label: "Tủ đồ", icon: "lock-closed" },
  { id: "parking", label: "Gửi xe", icon: "bicycle" },
  { id: "accessible", label: "Xe lăn", icon: "accessibility" },
  { id: "wifi", label: "Wifi", icon: "wifi" },
  { id: "towel", label: "Khăn tắm", icon: "shirt" },
];

// ❌ ĐÃ XÓA HOÀN TOÀN MOCK_BATHHOUSES

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
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<any>(null);

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
      // Chỉ lấy những địa điểm đã được duyệt (approved)
      const q = query(
        collection(db, "toilets"),
        where("status", "==", "approved")
      );
      const querySnapshot = await getDocs(q);
      const list: any[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // 🛠️ MÍT FIX: Logic lấy tọa độ thông minh
        // Ưu tiên lấy trong object 'location' (cấu trúc mới)
        // Nếu không có thì tìm 'latitude'/'longitude' (cấu trúc cũ)
        let lat = data.latitude;
        let lng = data.longitude;

        if (data.location && typeof data.location.latitude === 'number') {
             lat = data.location.latitude;
             lng = data.location.longitude;
        }

        // Chỉ thêm vào list nếu có tọa độ hợp lệ
        if (lat && lng) {
            list.push({ 
                id: doc.id, 
                ...data,
                latitude: lat, // Chuẩn hóa về latitude
                longitude: lng // Chuẩn hóa về longitude
            });
        }
      });

      setAllToilets(list);
      setDisplayedToilets(list);
    } catch (error) {
      console.log("Lỗi tải dữ liệu:", error);
      setAllToilets([]);
      setDisplayedToilets([]);
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
        .sort((a, b) => a.distance - b.distance);
    }

    setDisplayedToilets(filtered);

    if (text.trim()) {
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  };

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
    applyCombinedFilters(searchQuery, newFilters);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    applyCombinedFilters(text, activeFilters);
  };

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
              latitude: wc.latitude,
              longitude: wc.longitude,
            }}
            title={wc.name}
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
            placeholder="Tìm nhà tắm, spa..."
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

      {/* Kết quả tìm kiếm */}
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

  searchResultsContainer: {
    position: "absolute",
    top: 105,
    left: 20,
    right: 20,
    backgroundColor: "white",
    borderRadius: 15,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 20,
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