import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection } from 'firebase/firestore';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../firebaseConfig'; // Import auth để lấy email người tạo

// Danh sách tiện ích có sẵn
const AMENITIES_LIST = [
  { id: 'toilet', name: 'Bồn cầu', icon: 'man' },
  { id: 'paper', name: 'Giấy VS', icon: 'document-text' },
  { id: 'shower', name: 'Nhà tắm', icon: 'water' },
  { id: 'wifi', name: 'Wifi Free', icon: 'wifi' },
  { id: 'soap', name: 'Xà phòng', icon: 'cube' },
  { id: 'mirror', name: 'Gương', icon: 'images' },
];

export default function ProfileScreen() {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [price, setPrice] = useState('');
  
  // State lưu danh sách tiện ích đã chọn
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  // Hàm chọn/bỏ chọn tiện ích
  const toggleAmenity = (id: string) => {
    if (selectedAmenities.includes(id)) {
      setSelectedAmenities(selectedAmenities.filter(item => item !== id));
    } else {
      setSelectedAmenities([...selectedAmenities, id]);
    }
  };

  const handleAddWC = async () => {
    if (!name || !address || !price) {
      Alert.alert('Lỗi', 'Vui lòng nhập đủ tên, địa chỉ và giá tiền!');
      return;
    }

    try {
      await addDoc(collection(db, "toilets"), {
        name: name,
        address: address,
        price: Number(price),
        amenities: selectedAmenities, // 👉 Lưu cái mảng tiện ích này lên Firebase
        createdBy: auth.currentUser?.email || 'admin', // Lưu người tạo để sau này quản lý
        status: 'approved', // Tạm thời cho duyệt luôn để test cho lẹ
        rating: 5.0,
        ratingCount: 1,
        // Tọa độ random quanh Q1 (Demo)
        latitude: 10.7769 + (Math.random() * 0.01 - 0.005), 
        longitude: 106.7009 + (Math.random() * 0.01 - 0.005),
        createdAt: new Date().toISOString()
      });

      Alert.alert('Thành công', 'Đã thêm địa điểm mới!');
      setName(''); setAddress(''); setPrice(''); setSelectedAmenities([]); // Reset form
    } catch (error: any) {
      Alert.alert('Lỗi', error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.headerTitle}>Đóng góp địa điểm ➕</Text>
      
      <View style={styles.card}>
        <Text style={styles.label}>Tên địa điểm:</Text>
        <TextInput style={styles.input} placeholder="VD: WC Công viên..." value={name} onChangeText={setName} />

        <Text style={styles.label}>Địa chỉ:</Text>
        <TextInput style={styles.input} placeholder="VD: 123 Lê Lợi..." value={address} onChangeText={setAddress} />

        <Text style={styles.label}>Giá tiền (VNĐ):</Text>
        <TextInput style={styles.input} placeholder="0 nếu miễn phí" keyboardType="numeric" value={price} onChangeText={setPrice} />

        {/* 👉 PHẦN CHỌN TIỆN ÍCH */}
        <Text style={styles.label}>Tiện ích có sẵn:</Text>
        <View style={styles.amenitiesContainer}>
          {AMENITIES_LIST.map((item) => {
            const isSelected = selectedAmenities.includes(item.id);
            return (
              <TouchableOpacity 
                key={item.id} 
                style={[styles.amenityChip, isSelected && styles.amenityChipSelected]}
                onPress={() => toggleAmenity(item.id)}
              >
                <Ionicons name={item.icon as any} size={16} color={isSelected ? "white" : "#666"} />
                <Text style={[styles.amenityText, isSelected && styles.amenityTextSelected]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <TouchableOpacity style={styles.button} onPress={handleAddWC}>
          <Text style={styles.buttonText}>ĐĂNG LÊN BẢN ĐỒ</Text>
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
  
  // Style cho tiện ích
  amenitiesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  amenityChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#ddd' },
  amenityChipSelected: { backgroundColor: '#2196F3', borderColor: '#2196F3' },
  amenityText: { marginLeft: 5, fontSize: 12, color: '#666' },
  amenityTextSelected: { color: 'white', fontWeight: 'bold' },

  button: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});