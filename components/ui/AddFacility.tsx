import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection } from 'firebase/firestore';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../firebaseConfig';

// 👉 DANH SÁCH TIỆN ÍCH MỞ RỘNG (Siêu đầy đủ)
const AMENITIES_LIST = [
  // Nhóm cơ bản
  { id: 'hot_water', name: 'Nước nóng', icon: 'thermometer' },
  { id: 'towel', name: 'Khăn tắm', icon: 'shirt' },
  { id: 'soap', name: 'Dầu gội/Sữa tắm', icon: 'water' },
  { id: 'hair_dryer', name: 'Máy sấy tóc', icon: 'cut' },
  
  // Nhóm tiện nghi
  { id: 'locker', name: 'Tủ đồ khóa', icon: 'lock-closed' },
  { id: 'parking', name: 'Bãi gửi xe', icon: 'bicycle' },
  { id: 'wifi', name: 'Wifi Free', icon: 'wifi' },
  { id: 'wc', name: 'Nhà vệ sinh', icon: 'man' }, // Tất nhiên là có, nhưng cứ list ra cho chắc :v

  // Nhóm dịch vụ cao cấp (Thêm mới)
  { id: 'sauna', name: 'Xông hơi', icon: 'cloud' },
  { id: 'massage', name: 'Ghế Massage', icon: 'body' },
  { id: 'laundry', name: 'Giặt ủi', icon: 'shirt' },
  { id: 'shop', name: 'Quầy tạp hóa', icon: 'cart' },
  { id: 'charge', name: 'Sạc điện thoại', icon: 'battery-charging' },
  { id: 'accessible', name: 'Lối đi xe lăn', icon: 'accessibility' },
];

export default function AddFacility() {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [price, setPrice] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const toggleAmenity = (id: string) => {
    if (selectedAmenities.includes(id)) {
      setSelectedAmenities(selectedAmenities.filter(item => item !== id));
    } else {
      setSelectedAmenities([...selectedAmenities, id]);
    }
  };

  const handleAddWC = async () => {
    if (!name || !address || !price) {
      Alert.alert('Lỗi', 'Vui lòng nhập đủ tên, địa chỉ và giá vé!');
      return;
    }
    try {
      await addDoc(collection(db, "toilets"), {
        name: name,
        address: address,
        price: Number(price),
        amenities: selectedAmenities,
        createdBy: auth.currentUser?.email || 'admin',
        status: 'approved',
        rating: 5.0,
        ratingCount: 1,
        // Random vị trí quanh Sài Gòn
        latitude: 10.7769 + (Math.random() * 0.02 - 0.01), 
        longitude: 106.7009 + (Math.random() * 0.02 - 0.01),
        type: 'bathhouse',
        createdAt: new Date().toISOString()
      });
      Alert.alert('Thành công', 'Đã thêm nhà tắm mới!');
      setName(''); setAddress(''); setPrice(''); setSelectedAmenities([]);
    } catch (error: any) { Alert.alert('Lỗi', error.message); }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.headerTitle}>Thêm Nhà Tắm Mới 🚿</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Tên cơ sở:</Text>
        <TextInput style={styles.input} placeholder="VD: Bath Station Quận 1..." value={name} onChangeText={setName} />
        
        <Text style={styles.label}>Địa chỉ:</Text>
        <TextInput style={styles.input} placeholder="VD: 123 Nguyễn Huệ..." value={address} onChangeText={setAddress} />
        
        <Text style={styles.label}>Giá vé / lượt (VNĐ):</Text>
        <TextInput style={styles.input} placeholder="VD: 30000" keyboardType="numeric" value={price} onChangeText={setPrice} />
        
        <Text style={styles.label}>Dịch vụ & Tiện ích (Chọn nhiều):</Text>
        <View style={styles.amenitiesContainer}>
          {AMENITIES_LIST.map((item) => {
            const isSelected = selectedAmenities.includes(item.id);
            return (
              <TouchableOpacity 
                key={item.id} 
                style={[styles.amenityChip, isSelected && styles.amenityChipSelected]}
                onPress={() => toggleAmenity(item.id)}
              >
                <Ionicons name={item.icon as any} size={18} color={isSelected ? "white" : "#666"} />
                <Text style={[styles.amenityText, isSelected && styles.amenityTextSelected]}>{item.name}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
        <TouchableOpacity style={styles.button} onPress={handleAddWC}>
          <Text style={styles.buttonText}>ĐĂNG DỊCH VỤ</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#f0f2f5', paddingTop: 50 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 20 },
  card: { backgroundColor: 'white', borderRadius: 15, padding: 20, elevation: 5 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#555' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 16, backgroundColor: '#fafafa' },
  amenitiesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  amenityChip: { 
    flexDirection: 'row', alignItems: 'center', 
    paddingHorizontal: 10, paddingVertical: 8, 
    borderRadius: 8, // Bo góc ít hơn tí cho nam tính :D
    backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#eee',
    width: '48%' // Chia 2 cột cho đẹp
  },
  amenityChipSelected: { backgroundColor: '#2196F3', borderColor: '#2196F3' },
  amenityText: { marginLeft: 8, fontSize: 13, color: '#444' },
  amenityTextSelected: { color: 'white', fontWeight: '600' },
  button: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});