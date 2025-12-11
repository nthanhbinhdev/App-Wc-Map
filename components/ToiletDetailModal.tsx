import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, doc, increment, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image, Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../firebaseConfig';

// Danh sách icon (phải khớp với bên profile)
const AMENITIES_MAP: any = {
  'toilet': { name: 'Bồn cầu', icon: 'man' },
  'paper': { name: 'Giấy VS', icon: 'document-text' },
  'shower': { name: 'Nhà tắm', icon: 'water' },
  'wifi': { name: 'Wifi Free', icon: 'wifi' },
  'soap': { name: 'Xà phòng', icon: 'cube' },
  'mirror': { name: 'Gương', icon: 'images' },
};

const formatDistance = (meters: any) => {
  if (!meters) return '...';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

interface ToiletDetailModalProps {
  visible: boolean;
  onClose: () => void;
  toilet: any;
}

export default function ToiletDetailModal({ visible, onClose, toilet }: ToiletDetailModalProps) {
  const [myRating, setMyRating] = useState(0);

  useEffect(() => {
    setMyRating(0);
  }, [toilet]);

  const handleCheckIn = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Lỗi", "Bạn cần đăng nhập để Check-in!");
      return;
    }
    try {
      await addDoc(collection(db, "history"), {
        email: user.email,
        wcName: toilet.name,
        price: toilet.price,
        time: new Date().toLocaleString()
      });
      Alert.alert("✅ Thành công", "Cửa đã mở! Chúc bạn... nhẹ lòng!");
      onClose();
    } catch (error: any) {
      Alert.alert("Lỗi", "Toang rồi: " + error.message);
    }
  };

  const submitRating = async () => {
    if (myRating === 0) return;
    try {
      const currentRating = toilet.rating || 5.0;
      const currentCount = toilet.ratingCount || 1;
      const newRating = ((currentRating * currentCount) + myRating) / (currentCount + 1);
      
      const toiletRef = doc(db, "toilets", toilet.id);
      await updateDoc(toiletRef, {
        rating: Number(newRating.toFixed(1)),
        ratingCount: increment(1)
      });

      Alert.alert("Cảm ơn! 🌟", "Đánh giá của bạn đã được ghi nhận!");
      onClose();
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    }
  };

  if (!toilet) return null;

  return (
    <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
            
            <View style={styles.imageContainer}>
                <Image 
                    source={{ uri: toilet.image || 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600' }} 
                    style={styles.image} 
                />
                <TouchableOpacity style={styles.backButton} onPress={onClose}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
            </View>

            <View style={styles.body}>
                <Text style={styles.title}>{toilet.name}</Text>
                <View style={styles.rowInfo}>
                    <Ionicons name="location" size={16} color="#666" />
                    <Text style={styles.address}>{toilet.address}</Text>
                </View>

                {/* Badge thông tin cơ bản */}
                <View style={styles.badgeRow}>
                    <View style={[styles.badge, {backgroundColor: '#E3F2FD'}]}>
                        <Text style={[styles.badgeText, {color: '#2196F3'}]}>
                            💰 {toilet.price === 0 ? "Miễn phí" : `${Number(toilet.price).toLocaleString()}đ`}
                        </Text>
                    </View>
                    <View style={[styles.badge, {backgroundColor: '#FFF3E0'}]}>
                        <Ionicons name="star" size={14} color="#F57C00" />
                        <Text style={[styles.badgeText, {color: '#F57C00'}]}>
                             {toilet.rating || 5.0} ({toilet.ratingCount || 1})
                        </Text>
                    </View>
                </View>

                {/* 👉 HIỂN THỊ TIỆN ÍCH (AMENITIES) */}
                {toilet.amenities && toilet.amenities.length > 0 && (
                  <View style={styles.amenitiesSection}>
                    <Text style={styles.sectionTitle}>Tiện ích có sẵn ✅</Text>
                    <View style={styles.amenitiesGrid}>
                      {toilet.amenities.map((amenityId: string) => {
                        const item = AMENITIES_MAP[amenityId];
                        if (!item) return null;
                        return (
                          <View key={amenityId} style={styles.amenityItem}>
                            <View style={styles.amenityIconBox}>
                              <Ionicons name={item.icon} size={18} color="#4CAF50" />
                            </View>
                            <Text style={styles.amenityLabel}>{item.name}</Text>
                          </View>
                        )
                      })}
                    </View>
                  </View>
                )}

                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>Mô tả</Text>
                <Text style={styles.desc}>
                    Khoảng cách từ bạn: {formatDistance(toilet.distance)}.
                    {"\n"}Khu vực vệ sinh công cộng sạch sẽ, an toàn. Vui lòng giữ gìn vệ sinh chung sau khi sử dụng.
                </Text>

                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>Đánh giá trải nghiệm</Text>
                <View style={styles.starContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity key={star} onPress={() => setMyRating(star)}>
                            <Ionicons name={star <= myRating ? "star" : "star-outline"} size={36} color="#FBC02D" style={{marginHorizontal: 5}} />
                        </TouchableOpacity>
                    ))}
                </View>
                {myRating > 0 && (
                    <TouchableOpacity style={styles.submitRatingBtn} onPress={submitRating}>
                        <Text style={styles.submitRatingText}>Gửi đánh giá {myRating} sao</Text>
                    </TouchableOpacity>
                )}
                
                <View style={{height: 80}} />
            </View>
        </ScrollView>

        <View style={styles.footer}>
             <TouchableOpacity style={styles.checkinButton} onPress={handleCheckIn}>
                <Ionicons name="qr-code-outline" size={24} color="white" style={{marginRight: 10}} />
                <Text style={styles.checkinText}>CHECK-IN MỞ CỬA</Text>
             </TouchableOpacity>
        </View>

      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  scrollContent: { paddingBottom: 20 },
  imageContainer: { position: 'relative' },
  image: { width: '100%', height: 250, resizeMode: 'cover' },
  backButton: {
    position: 'absolute', top: Platform.OS === 'ios' ? 50 : 20, left: 20,
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'white',
    justifyContent: 'center', alignItems: 'center', elevation: 5
  },
  body: { padding: 20, marginTop: -20, backgroundColor: 'white', borderTopLeftRadius: 25, borderTopRightRadius: 25 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  rowInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  address: { fontSize: 16, color: '#666', marginLeft: 5 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 15 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { fontWeight: 'bold', marginLeft: 4, fontSize: 14 },
  
  // Style mới cho Amenities
  amenitiesSection: { marginTop: 10, marginBottom: 10 },
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15 },
  amenityItem: { alignItems: 'center', width: '20%' },
  amenityIconBox: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  amenityLabel: { fontSize: 11, color: '#555', textAlign: 'center' },

  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  desc: { fontSize: 15, lineHeight: 24, color: '#555' },
  starContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 15 },
  submitRatingBtn: { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 8, backgroundColor: '#FFF9C4', borderRadius: 20 },
  submitRatingText: { color: '#F57F17', fontWeight: 'bold' },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'white', padding: 20, borderTopWidth: 1, borderTopColor: '#EEE', elevation: 10
  },
  checkinButton: {
    backgroundColor: '#4CAF50', height: 55, borderRadius: 15,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 5
  },
  checkinText: { color: 'white', fontWeight: 'bold', fontSize: 18 }
});