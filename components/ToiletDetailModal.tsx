import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, doc, increment, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../firebaseConfig';

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
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewText, setReviewText] = useState('');
  const [myRating, setMyRating] = useState(0);
  const [isWritingReview, setIsWritingReview] = useState(false);

  // Reset khi mở modal mới
  useEffect(() => {
    setMyRating(0);
    setReviewText('');
    setIsWritingReview(false);
  }, [toilet]);

  // Lắng nghe danh sách Review từ Firebase
  useEffect(() => {
    if (!toilet) return;
    const q = query(
      collection(db, "reviews"), 
      where("toiletId", "==", toilet.id),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setReviews(list);
    });
    return () => unsubscribe();
  }, [toilet]);

  const handleCheckIn = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Lỗi", "Bạn cần đăng nhập!");
      return;
    }
    try {
      await addDoc(collection(db, "history"), {
        email: user.email,
        wcName: toilet.name,
        price: toilet.price,
        time: new Date().toLocaleString()
      });
      Alert.alert("✅ Check-in thành công", "Cửa đã mở! Chúc bạn... nhẹ lòng!");
    } catch (error: any) {
      Alert.alert("Lỗi", error.message);
    }
  };

  const submitReview = async () => {
    if (myRating === 0) {
      Alert.alert("Khoan!", "Vui lòng chọn số sao ⭐");
      return;
    }
    const user = auth.currentUser;
    if (!user) return;

    try {
      // 1. Lưu Review chi tiết
      await addDoc(collection(db, "reviews"), {
        toiletId: toilet.id,
        userEmail: user.email,
        userName: user.displayName || 'Ẩn danh',
        userPhoto: user.photoURL,
        rating: myRating,
        comment: reviewText,
        createdAt: new Date().toISOString()
      });

      // 2. Cập nhật điểm trung bình cho WC
      const currentRating = toilet.rating || 5.0;
      const currentCount = toilet.ratingCount || 1;
      const newRating = ((currentRating * currentCount) + myRating) / (currentCount + 1);
      
      const toiletRef = doc(db, "toilets", toilet.id);
      await updateDoc(toiletRef, {
        rating: Number(newRating.toFixed(1)),
        ratingCount: increment(1)
      });

      Alert.alert("Cảm ơn! 🌟", "Đánh giá của bạn giúp cộng đồng tốt hơn!");
      setMyRating(0);
      setReviewText('');
      setIsWritingReview(false);
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    }
  };

  const handleReport = () => {
    Alert.alert("Báo cáo", "Vui lòng chọn vấn đề:", [
      { text: "Hủy", style: "cancel" },
      { text: "Sai thông tin", onPress: () => sendReport("Sai thông tin") },
      { text: "Đã đóng cửa", onPress: () => sendReport("Đã đóng cửa") },
      { text: "Vấn đề vệ sinh", onPress: () => sendReport("Vấn đề vệ sinh") },
    ]);
  };

  const sendReport = async (issue: string) => {
    const user = auth.currentUser;
    await addDoc(collection(db, "incidents"), {
      toiletId: toilet.id,
      toiletName: toilet.name,
      issue: issue,
      reportedBy: user?.email,
      providerEmail: toilet.createdBy, 
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    Alert.alert("Đã gửi", "Cảm ơn bạn đã báo cáo.");
  };

  if (!toilet) return null;

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header điều hướng */}
        <View style={styles.headerNav}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
             <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{toilet.name}</Text>
          <View style={{width: 24}} /> 
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Ảnh bìa */}
            <Image 
                source={{ uri: toilet.image || 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600' }} 
                style={styles.heroImage} 
            />

            <View style={styles.section}>
                <Text style={styles.title}>{toilet.name}</Text>
                <View style={styles.ratingRow}>
                   <Text style={styles.ratingBig}>{toilet.rating || 5.0}</Text>
                   <View style={styles.stars}>
                      {[1,2,3,4,5].map(i => (
                        <Ionicons key={i} name="star" size={14} color={i <= Math.round(toilet.rating||5) ? "#FBC02D" : "#ddd"} />
                      ))}
                   </View>
                   <Text style={styles.ratingCount}>({toilet.ratingCount || 1} đánh giá)</Text>
                </View>
                <Text style={styles.subtitle}>Nhà vệ sinh công cộng • {formatDistance(toilet.distance)}</Text>
            </View>

            {/* ACTION BUTTONS - Style Google Maps */}
            <View style={styles.actionRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={handleCheckIn}>
                    <View style={[styles.actionIconCircle, {backgroundColor: '#1A73E8'}]}>
                       <Ionicons name="qr-code" size={24} color="white" />
                    </View>
                    <Text style={[styles.actionLabel, {color: '#1A73E8'}]}>Check-in</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={() => { /* Logic chỉ đường cũ */ }}>
                    <View style={styles.actionIconCircle}>
                       <Ionicons name="navigate" size={24} color="#1A73E8" />
                    </View>
                    <Text style={styles.actionLabel}>Chỉ đường</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={handleReport}>
                    <View style={styles.actionIconCircle}>
                       <Ionicons name="warning-outline" size={24} color="#D93025" />
                    </View>
                    <Text style={styles.actionLabel}>Báo lỗi</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Phần thông tin thêm */}
            <View style={styles.section}>
               <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={20} color="#555" style={{marginRight: 10}}/>
                  <Text style={styles.infoText}>{toilet.address}</Text>
               </View>
               <View style={styles.infoRow}>
                  <Ionicons name="cash-outline" size={20} color="#555" style={{marginRight: 10}}/>
                  <Text style={styles.infoText}>{toilet.price === 0 ? "Miễn phí" : `${Number(toilet.price).toLocaleString()}đ`}</Text>
               </View>
               {/* Tiện ích */}
               {toilet.amenities && (
                 <View style={styles.chipContainer}>
                    {toilet.amenities.map((am: string) => (
                      <View key={am} style={styles.chip}>
                        <Text style={styles.chipText}>{am}</Text>
                      </View>
                    ))}
                 </View>
               )}
            </View>

            <View style={styles.divider} />

            {/* PHẦN ĐÁNH GIÁ CỦA CỘNG ĐỒNG */}
            <View style={styles.section}>
                <Text style={styles.sectionHeader}>Bài đánh giá</Text>
                
                {/* Khu vực viết đánh giá */}
                {!isWritingReview ? (
                   <TouchableOpacity style={styles.writeReviewBtn} onPress={() => setIsWritingReview(true)}>
                      <View style={styles.userAvatarSmall} /> 
                      <View style={styles.fakeInput}>
                        <View style={{flexDirection:'row'}}>
                          {[1,2,3,4,5].map(i => <Ionicons key={i} name="star-outline" size={16} color="#888" />)}
                        </View>
                        <Text style={{color:'#666', marginLeft: 10}}>Chạm để xếp hạng...</Text>
                      </View>
                   </TouchableOpacity>
                ) : (
                  <View style={styles.reviewForm}>
                    <Text style={{marginBottom: 10, fontWeight: 'bold'}}>Trải nghiệm của bạn thế nào?</Text>
                    <View style={{flexDirection: 'row', justifyContent: 'center', marginBottom: 15}}>
                       {[1,2,3,4,5].map(star => (
                         <TouchableOpacity key={star} onPress={() => setMyRating(star)} style={{padding: 5}}>
                           <Ionicons name={star <= myRating ? "star" : "star-outline"} size={32} color="#FBC02D" />
                         </TouchableOpacity>
                       ))}
                    </View>
                    <TextInput 
                      style={styles.reviewInput} 
                      placeholder="Chia sẻ thêm về trải nghiệm..." 
                      multiline 
                      value={reviewText}
                      onChangeText={setReviewText}
                    />
                    <View style={{flexDirection: 'row', justifyContent: 'flex-end', gap: 10}}>
                      <TouchableOpacity onPress={() => setIsWritingReview(false)} style={styles.cancelBtn}>
                        <Text style={{color: '#666'}}>Hủy</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={submitReview} style={styles.postBtn}>
                        <Text style={{color: 'white', fontWeight: 'bold'}}>Đăng</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Danh sách review */}
                {reviews.map((rev) => (
                  <View key={rev.id} style={styles.reviewItem}>
                    <Image 
                      source={{ uri: rev.userPhoto || `https://ui-avatars.com/api/?name=${rev.userName}&background=random` }} 
                      style={styles.reviewerAvatar} 
                    />
                    <View style={{flex: 1}}>
                       <Text style={styles.reviewerName}>{rev.userName}</Text>
                       <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          {[...Array(rev.rating)].map((_, i) => (
                             <Ionicons key={i} name="star" size={12} color="#FBC02D" />
                          ))}
                          <Text style={styles.reviewDate}> • {new Date(rev.createdAt).toLocaleDateString()}</Text>
                       </View>
                       {rev.comment ? <Text style={styles.reviewText}>{rev.comment}</Text> : null}
                    </View>
                  </View>
                ))}
            </View>
            <View style={{height: 40}} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  headerNav: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  backButton: { padding: 5 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  scrollContent: { paddingBottom: 20 },
  heroImage: { width: '100%', height: 200, resizeMode: 'cover' },
  
  section: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#202124' },
  subtitle: { color: '#5F6368', marginTop: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  ratingBig: { fontSize: 16, fontWeight: 'bold', color: '#202124', marginRight: 5 },
  stars: { flexDirection: 'row', marginRight: 5 },
  ratingCount: { color: '#5F6368' },

  // Action Buttons kiểu Google Maps
  actionRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  actionBtn: { alignItems: 'center', width: 80 },
  actionIconCircle: { 
    width: 40, height: 40, borderRadius: 20, 
    borderWidth: 1, borderColor: '#DADCE0', 
    justifyContent: 'center', alignItems: 'center', marginBottom: 5 
  },
  actionLabel: { fontSize: 12, color: '#1A73E8', fontWeight: '500' },

  divider: { height: 8, backgroundColor: '#F0F2F5' },

  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  infoText: { fontSize: 15, color: '#3C4043', flex: 1 },
  
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 5 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#DADCE0' },
  chipText: { fontSize: 12, color: '#3C4043' },

  // Review Styles
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#202124', marginBottom: 15 },
  writeReviewBtn: { flexDirection: 'row', alignItems: 'center' },
  userAvatarSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#ddd', marginRight: 10 },
  fakeInput: { flex: 1, padding: 10, borderWidth: 1, borderColor: '#DADCE0', borderRadius: 20, flexDirection: 'row', alignItems: 'center' },
  
  reviewForm: { padding: 15, borderWidth: 1, borderColor: '#eee', borderRadius: 10 },
  reviewInput: { borderWidth: 1, borderColor: '#DADCE0', borderRadius: 5, padding: 10, height: 80, textAlignVertical: 'top', marginBottom: 15 },
  cancelBtn: { padding: 10 },
  postBtn: { backgroundColor: '#1A73E8', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },

  reviewItem: { flexDirection: 'row', marginTop: 20 },
  reviewerAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 10 },
  reviewerName: { fontWeight: 'bold', fontSize: 14, color: '#202124' },
  reviewDate: { fontSize: 12, color: '#5F6368' },
  reviewText: { marginTop: 5, color: '#3C4043', lineHeight: 20 },
});