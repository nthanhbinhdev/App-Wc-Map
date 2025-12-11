import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

// 👉 SỬA ĐƯỜNG DẪN IMPORT Ở ĐÂY:
import { db } from '../../firebaseConfig'; // Lùi 2 cấp ra root
import ToiletDetailModal from '../ToiletDetailModal'; // Lùi 1 cấp ra components

export default function UserMap() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [toilets, setToilets] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedWC, setSelectedWC] = useState<any>(null);

  const getUserLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    let location = await Location.getCurrentPositionAsync({});
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  useEffect(() => { getUserLocation(); }, []);

  const fetchToilets = async () => {
    try {
      const q = query(collection(db, "toilets"), where("status", "==", "approved"));
      const querySnapshot = await getDocs(q);
      const list: any[] = [];
      querySnapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setToilets(list);
    } catch (error) { console.log(error); }
  };

  useFocusEffect(useCallback(() => { fetchToilets(); }, []));

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{ latitude: 10.7769, longitude: 106.7009, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        {toilets.map((wc) => (
          <Marker
            key={wc.id}
            coordinate={{ latitude: wc.latitude || 10, longitude: wc.longitude || 106 }}
            title={wc.name}
            pinColor="#2196F3" 
            onCalloutPress={() => { setSelectedWC(wc); setModalVisible(true); }}
          />
        ))}
      </MapView>

      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" style={{marginRight: 10}} />
          <TextInput placeholder="Tìm kiếm vị trí..." style={styles.input} />
        </View>
        <TouchableOpacity style={styles.listButton} onPress={() => router.push('/(tabs)/explore')}>
          <Text style={styles.listText}>List</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.myLocationBtn} onPress={getUserLocation}>
         <Ionicons name="locate" size={24} color="#2196F3" />
      </TouchableOpacity>

      <ToiletDetailModal visible={modalVisible} toilet={selectedWC} onClose={() => setModalVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
  searchWrapper: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchBar: { flex: 1, flexDirection: 'row', backgroundColor: 'white', borderRadius: 25, paddingHorizontal: 15, height: 50, alignItems: 'center', elevation: 5 },
  input: { flex: 1, fontSize: 16 },
  listButton: { backgroundColor: 'white', paddingHorizontal: 15, height: 50, borderRadius: 25, justifyContent: 'center', elevation: 5 },
  listText: { fontWeight: 'bold', color: '#333' },
  myLocationBtn: { position: 'absolute', bottom: 30, right: 20, width: 50, height: 50, borderRadius: 25, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', elevation: 5 }
});