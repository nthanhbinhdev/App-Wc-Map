// import { Ionicons } from '@expo/vector-icons'; // Lấy icon kính lúp
// import { useFocusEffect, useRouter } from 'expo-router';
// import { collection, getDocs } from 'firebase/firestore';
// import React, { useCallback, useState } from 'react';
// import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
// import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
// import { db } from '../../firebaseConfig';

// export default function HomeScreen() {
//   const router = useRouter();
//   const [toilets, setToilets] = useState<any[]>([]);

//   // Tải dữ liệu WC (Giống bên explore cũ)
//   const fetchToilets = async () => {
//     try {
//       const querySnapshot = await getDocs(collection(db, "toilets"));
//       const list: any[] = [];
//       querySnapshot.forEach((doc) => {
//         list.push({ id: doc.id, ...doc.data() });
//       });
//       setToilets(list);
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   useFocusEffect(
//     useCallback(() => {
//       fetchToilets();
//     }, [])
//   );

//   return (
//     <View style={styles.container}>
//       {/* 1. BẢN ĐỒ LÀM NỀN */}
//       <MapView
//         provider={PROVIDER_GOOGLE}
//         style={styles.map}
//         initialRegion={{
//           latitude: 10.7769,
//           longitude: 106.7009,
//           latitudeDelta: 0.01, // Zoom gần hơn tí cho giống ảnh mẫu
//           longitudeDelta: 0.01,
//         }}
//         showsUserLocation={true}
//       >
//         {toilets.map((wc) => (
//           <Marker
//             key={wc.id}
//             coordinate={{
//               latitude: wc.latitude || 10,
//               longitude: wc.longitude || 106
//             }}
//             title={wc.name}
//             // Đổi màu ghim sang xanh dương cho giống ảnh mẫu
//             pinColor="#2196F3" 
//             onCalloutPress={() => {
//               router.push({
//                 pathname: "/detail",
//                 params: { name: wc.name, address: wc.address, price: wc.price }
//               });
//             }}
//           />
//         ))}
//       </MapView>

//       {/* 2. THANH TÌM KIẾM (NỔI Ở TRÊN) */}
//       <View style={styles.searchWrapper}>
//         <View style={styles.searchBar}>
//           <Ionicons name="search" size={20} color="#666" style={{marginRight: 10}} />
//           <TextInput 
//             placeholder="Tìm kiếm vị trí..." 
//             style={styles.input}
//           />
//         </View>
        
//         {/* Nút "See list" bên cạnh */}
//         <TouchableOpacity style={styles.listButton}>
//           <Text style={styles.listText}>List</Text>
//         </TouchableOpacity>
//       </View>

//       {/* 3. NÚT ĐỊNH VỊ (NỔI Ở DƯỚI) */}
//       <TouchableOpacity style={styles.myLocationBtn} onPress={() => Alert.alert("Vị trí", "Đang lấy vị trí...")}>
//          <Ionicons name="locate" size={24} color="#2196F3" />
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1 },
//   map: { width: '100%', height: '100%' },
  
//   // Style cho thanh tìm kiếm nổi
//   searchWrapper: {
//     position: 'absolute',
//     top: 50, // Cách mép trên
//     left: 20,
//     right: 20,
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 10,
//   },
//   searchBar: {
//     flex: 1,
//     flexDirection: 'row',
//     backgroundColor: 'white',
//     borderRadius: 25, // Bo tròn
//     paddingHorizontal: 15,
//     height: 50,
//     alignItems: 'center',
//     shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5,
//   },
//   input: { flex: 1, fontSize: 16 },
//   listButton: {
//     backgroundColor: 'white',
//     paddingHorizontal: 15,
//     height: 50,
//     borderRadius: 25,
//     justifyContent: 'center',
//     shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5,
//   },
//   listText: { fontWeight: 'bold', color: '#333' },

//   // Nút định vị tròn tròn
//   myLocationBtn: {
//     position: 'absolute',
//     bottom: 30,
//     right: 20,
//     width: 50,
//     height: 50,
//     borderRadius: 25,
//     backgroundColor: 'white',
//     justifyContent: 'center',
//     alignItems: 'center',
//     shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5,
//   }
// });

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { db } from '../../firebaseConfig';
// 👇 Import bộ định vị mới cài
import * as Location from 'expo-location';

export default function HomeScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null); // Để điều khiển cái bản đồ
  const [toilets, setToilets] = useState<any[]>([]);
  const [location, setLocation] = useState<Location.LocationObject | null>(null); // Lưu vị trí của mình

  // 1. Hàm xin quyền và lấy vị trí thật
  const getUserLocation = async () => {
    // Xin phép
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Úi!', 'Cho tui xin quyền vị trí để tìm WC gần bạn nhé!');
      return;
    }

    // Lấy tọa độ
    let currentLocation = await Location.getCurrentPositionAsync({});
    setLocation(currentLocation);
    
    // Bay bản đồ về chỗ mình
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  // Chạy 1 lần lúc mở app để lấy vị trí ngay
  useEffect(() => {
    getUserLocation();
  }, []);

  // Tải dữ liệu WC (Giữ nguyên)
  const fetchToilets = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "toilets"));
      const list: any[] = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setToilets(list);
    } catch (error) {
      console.log(error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchToilets();
    }, [])
  );

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef} // Gắn ref để điều khiển
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: 10.7769, // Mặc định vẫn là Sài Gòn
          longitude: 106.7009,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={true} // 👉 Cái này quan trọng: Hiện chấm xanh
        showsMyLocationButton={false} // Tắt nút mặc định của Google để dùng nút đẹp của mình
      >
        {toilets.map((wc) => (
          <Marker
            key={wc.id}
            coordinate={{
              latitude: wc.latitude || 10,
              longitude: wc.longitude || 106
            }}
            title={wc.name}
            pinColor="#2196F3" 
            onCalloutPress={() => {
              router.push({
                pathname: "/detail",
                params: { name: wc.name, address: wc.address, price: wc.price }
              });
            }}
          />
        ))}
      </MapView>

      {/* THANH TÌM KIẾM */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" style={{marginRight: 10}} />
          <TextInput placeholder="Tìm kiếm vị trí..." style={styles.input} />
        </View>
        <TouchableOpacity style={styles.listButton}>
          <Text style={styles.listText}>List</Text>
        </TouchableOpacity>
      </View>

      {/* NÚT ĐỊNH VỊ (Bấm vào là bay về chỗ mình) */}
      <TouchableOpacity style={styles.myLocationBtn} onPress={getUserLocation}>
         <Ionicons name="locate" size={24} color="#2196F3" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
  searchWrapper: {
    position: 'absolute', top: 50, left: 20, right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  searchBar: {
    flex: 1, flexDirection: 'row', backgroundColor: 'white',
    borderRadius: 25, paddingHorizontal: 15, height: 50, alignItems: 'center',
    shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5,
  },
  input: { flex: 1, fontSize: 16 },
  listButton: {
    backgroundColor: 'white', paddingHorizontal: 15, height: 50,
    borderRadius: 25, justifyContent: 'center',
    shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5,
  },
  listText: { fontWeight: 'bold', color: '#333' },
  myLocationBtn: {
    position: 'absolute', bottom: 30, right: 20,
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'white', justifyContent: 'center', alignItems: 'center',
    shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5,
  }
});