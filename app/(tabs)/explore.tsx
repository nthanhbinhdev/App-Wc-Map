import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { db } from '../../firebaseConfig';
// 👇 IMPORT MODULE XỊN VỪA TẠO
import ToiletDetailModal from '../../components/ToiletDetailModal';

// --- CÁC HÀM TIỆN ÍCH ---
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const formatDistance = (meters: number) => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

const openMaps = (lat: number, lng: number, label: string) => {
  const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
  const latLng = `${lat},${lng}`;
  const labelEncoded = encodeURIComponent(label);
  const url = Platform.select({
    ios: `${scheme}${labelEncoded}@${latLng}`,
    android: `${scheme}${latLng}(${labelEncoded})`
  });
  Linking.openURL(url || `http://googleusercontent.com/maps.google.com/maps?q=${lat},${lng}`);
};

// --- MÀN HÌNH CHÍNH ---

export default function ListScreen() {
  const [toilets, setToilets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<any>(null);

  // State quản lý Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedWC, setSelectedWC] = useState<any>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation(loc);
      }
    })();
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "toilets"), where("status", "==", "approved"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({ id: doc.id, ...data, rawLat: data.latitude, rawLng: data.longitude });
      });
      setToilets(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const sortedToilets = useMemo(() => {
    if (!userLocation) return toilets;
    const listWithDistance = toilets.map(item => {
      const dist = getDistance(userLocation.coords.latitude, userLocation.coords.longitude, item.rawLat, item.rawLng);
      return { ...item, distance: dist };
    });
    return listWithDistance.sort((a, b) => a.distance - b.distance);
  }, [toilets, userLocation]);

  // Hàm mở modal
  const handleOpenDetail = (item: any) => {
    setSelectedWC(item);
    setModalVisible(true);
  };

  // Render Item (Thẻ rút gọn)
  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleOpenDetail(item)}>
      <View style={styles.cardContent}>
        {/* Header */}
        <View style={styles.topRow}>
          <View style={{ flex: 1, marginRight: 5 }}>
            <Text style={styles.cardTitle}>{item.name}</Text>
          </View>
          <View style={styles.ratingBox}>
            <Text style={styles.ratingText}>{item.rating || 5.0}</Text>
            <Ionicons name="star" size={10} color="white" />
          </View>
        </View>
        {/* Address */}
        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={14} color="#888" style={{ marginTop: 2 }} />
          <Text style={styles.cardAddress} numberOfLines={2}>{item.address}</Text>
        </View>
        <View style={styles.dashedLine} />
        {/* Footer */}
        <View style={styles.footerRow}>
          <View>
            <Text style={[styles.cardPrice, { color: item.price === 0 ? '#4CAF50' : '#2196F3' }]}>
              {item.price === 0 ? "MIỄN PHÍ" : `${Number(item.price).toLocaleString()}đ`}
            </Text>
            <View style={styles.distanceBadge}>
              <Ionicons name="walk" size={12} color="#FF5722" />
              <Text style={styles.distanceText}>
                {item.distance > 0 ? formatDistance(item.distance) : "? km"}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.navigateBtn} onPress={() => openMaps(item.rawLat, item.rawLng, item.name)}>
            <Ionicons name="arrow-redo" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gần bạn nhất</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2196F3" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={sortedToilets}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={styles.columnWrapper}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 50, color: 'gray' }}>Chưa tìm thấy...</Text>}
        />
      )}

      {/* 👉 SỬ DỤNG MODULE CHI TIẾT Ở ĐÂY */}
      <ToiletDetailModal
        visible={modalVisible}
        toilet={selectedWC}
        onClose={() => setModalVisible(false)}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F8', paddingTop: 50 },
  header: { paddingHorizontal: 20, marginBottom: 15 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#1A1A1A' },
  listContainer: { paddingHorizontal: 12, paddingBottom: 20 },
  columnWrapper: { justifyContent: 'space-between' },
  card: {
    backgroundColor: 'white', width: '48%', marginBottom: 12, borderRadius: 16,
    shadowColor: "#6DA0C9", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
    borderWidth: 1, borderColor: 'white'
  },
  cardContent: { padding: 12, flex: 1, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#333', lineHeight: 20 },
  ratingBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FBC02D', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginLeft: 4 },
  ratingText: { fontSize: 10, color: 'white', fontWeight: 'bold', marginRight: 2 },
  addressRow: { flexDirection: 'row', marginBottom: 10 },
  cardAddress: { fontSize: 12, color: '#666', marginLeft: 4, flex: 1 },
  dashedLine: { height: 1, backgroundColor: '#EEE', marginVertical: 8, width: '100%' },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardPrice: { fontSize: 13, fontWeight: '900', marginBottom: 4 },
  distanceBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF0E6', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  distanceText: { fontSize: 11, fontWeight: 'bold', color: '#FF5722', marginLeft: 3 },
  navigateBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2196F3', justifyContent: 'center', alignItems: 'center', shadowColor: "#2196F3", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 3 },
});