// // components/ui/QRScanner.tsx
// // Để sử dụng component này, cần cài thêm: expo install expo-camera expo-barcode-scanner

// import { Ionicons } from '@expo/vector-icons';
// import { BarCodeScanner } from 'expo-barcode-scanner';
// import { Camera } from 'expo-camera';
// import { doc, getDoc, updateDoc } from 'firebase/firestore';
// import React, { useEffect, useState } from 'react';
// import {
//   Alert,
//   Modal,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View
// } from 'react-native';
// import { db } from '../../firebaseConfig';

// interface QRScannerProps {
//   visible: boolean;
//   onClose: () => void;
//   onSuccess?: () => void;
// }

// export default function QRScanner({ visible, onClose, onSuccess }: QRScannerProps) {
//   const [hasPermission, setHasPermission] = useState<boolean | null>(null);
//   const [scanned, setScanned] = useState(false);
//   const [processing, setProcessing] = useState(false);

//   useEffect(() => {
//     (async () => {
//       const { status } = await Camera.requestCameraPermissionsAsync();
//       setHasPermission(status === 'granted');
//     })();
//   }, []);

//   useEffect(() => {
//     if (visible) {
//       setScanned(false);
//     }
//   }, [visible]);

//   const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
//     if (scanned || processing) return;
    
//     setScanned(true);
//     setProcessing(true);

//     try {
//       // Validate QR format: BOOKING_{userId}_{timestamp}_{roomId}
//       if (!data.startsWith('BOOKING_')) {
//         Alert.alert('Lỗi', 'Mã QR không hợp lệ');
//         setScanned(false);
//         setProcessing(false);
//         return;
//       }

//       // Tìm booking trong database
//       const bookingRef = doc(db, 'bookings', data); // Giả sử data chứa bookingId
//       const bookingSnap = await getDoc(bookingRef);

//       if (!bookingSnap.exists()) {
//         // Nếu không tìm thấy bằng ID, tìm bằng qrCode field
//         // (Cần implement query để tìm booking theo qrCode)
//         Alert.alert('Lỗi', 'Không tìm thấy booking này trong hệ thống');
//         setScanned(false);
//         setProcessing(false);
//         return;
//       }

//       const booking = bookingSnap.data();

//       // Kiểm tra trạng thái
//       if (booking.status === 'cancelled' || booking.status === 'expired') {
//         Alert.alert('Lỗi', 'Booking này đã bị hủy hoặc hết hạn');
//         setScanned(false);
//         setProcessing(false);
//         return;
//       }

//       if (booking.status === 'checked_in') {
//         Alert.alert('Thông báo', 'Khách đã check-in rồi');
//         setScanned(false);
//         setProcessing(false);
//         return;
//       }

//       // Kiểm tra thời gian
//       const now = Date.now();
//       const expiry = new Date(booking.expiryTime).getTime();

//       if (now > expiry) {
//         // Hết hạn
//         Alert.alert('Hết hạn', 'Booking đã quá thời gian giữ chỗ');
        
//         // Tự động cập nhật status
//         await updateDoc(bookingRef, {
//           status: 'expired',
//           updatedAt: new Date().toISOString()
//         });

//         // Giải phóng phòng
//         await updateDoc(doc(db, 'rooms', booking.roomId), {
//           status: 'available',
//           currentBookingId: null,
//           lastUpdated: new Date().toISOString()
//         });

//         setScanned(false);
//         setProcessing(false);
//         return;
//       }

//       // CHECK-IN THÀNH CÔNG
//       const checkInTime = new Date().toISOString();

//       await updateDoc(bookingRef, {
//         status: 'checked_in',
//         checkInTime,
//         updatedAt: checkInTime
//       });

//       await updateDoc(doc(db, 'rooms', booking.roomId), {
//         status: 'occupied',
//         lastUpdated: checkInTime
//       });

//       Alert.alert(
//         '✅ Check-in thành công!',
//         `Phòng ${booking.roomNumber}\nKhách: ${booking.userName}\n\nChúc quý khách có trải nghiệm tốt!`,
//         [
//           {
//             text: 'OK',
//             onPress: () => {
//               onSuccess?.();
//               onClose();
//             }
//           }
//         ]
//       );

//     } catch (error: any) {
//       console.error(error);
//       Alert.alert('Lỗi', error.message);
//       setScanned(false);
//     } finally {
//       setProcessing(false);
//     }
//   };

//   if (hasPermission === null) {
//     return (
//       <Modal visible={visible} animationType="slide">
//         <View style={styles.container}>
//           <Text>Đang yêu cầu quyền camera...</Text>
//         </View>
//       </Modal>
//     );
//   }

//   if (hasPermission === false) {
//     return (
//       <Modal visible={visible} animationType="slide">
//         <View style={styles.container}>
//           <Text style={styles.errorText}>Không có quyền truy cập camera</Text>
//           <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
//             <Text style={styles.closeBtnText}>Đóng</Text>
//           </TouchableOpacity>
//         </View>
//       </Modal>
//     );
//   }

//   return (
//     <Modal visible={visible} animationType="slide">
//       <View style={styles.container}>
//         <View style={styles.header}>
//           <TouchableOpacity onPress={onClose} style={styles.backBtn}>
//             <Ionicons name="close" size={28} color="white" />
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>Quét mã QR Check-in</Text>
//           <View style={{ width: 28 }} />
//         </View>

//         <BarCodeScanner
//           onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
//           style={StyleSheet.absoluteFillObject}
//         />

//         <View style={styles.overlay}>
//           <View style={styles.scanArea}>
//             <View style={[styles.corner, styles.topLeft]} />
//             <View style={[styles.corner, styles.topRight]} />
//             <View style={[styles.corner, styles.bottomLeft]} />
//             <View style={[styles.corner, styles.bottomRight]} />
//           </View>

//           <Text style={styles.instruction}>
//             Đưa mã QR vào giữa khung hình
//           </Text>

//           {processing && (
//             <View style={styles.processingBox}>
//               <Text style={styles.processingText}>Đang xử lý...</Text>
//             </View>
//           )}

//           {scanned && !processing && (
//             <TouchableOpacity
//               style={styles.rescanBtn}
//               onPress={() => setScanned(false)}
//             >
//               <Text style={styles.rescanBtnText}>Quét lại</Text>
//             </TouchableOpacity>
//           )}
//         </View>
//       </View>
//     </Modal>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: 'black'
//   },
//   header: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     zIndex: 10,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingTop: 50,
//     paddingHorizontal: 20,
//     paddingBottom: 15,
//     backgroundColor: 'rgba(0,0,0,0.5)'
//   },
//   backBtn: {
//     padding: 5
//   },
//   headerTitle: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: 'white'
//   },
//   overlay: {
//     ...StyleSheet.absoluteFillObject,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: 'rgba(0,0,0,0.5)'
//   },
//   scanArea: {
//     width: 250,
//     height: 250,
//     backgroundColor: 'transparent',
//     position: 'relative'
//   },
//   corner: {
//     position: 'absolute',
//     width: 30,
//     height: 30,
//     borderColor: '#4CAF50',
//     borderWidth: 3
//   },
//   topLeft: {
//     top: 0,
//     left: 0,
//     borderRightWidth: 0,
//     borderBottomWidth: 0
//   },
//   topRight: {
//     top: 0,
//     right: 0,
//     borderLeftWidth: 0,
//     borderBottomWidth: 0
//   },
//   bottomLeft: {
//     bottom: 0,
//     left: 0,
//     borderRightWidth: 0,
//     borderTopWidth: 0
//   },
//   bottomRight: {
//     bottom: 0,
//     right: 0,
//     borderLeftWidth: 0,
//     borderTopWidth: 0
//   },
//   instruction: {
//     marginTop: 40,
//     fontSize: 16,
//     color: 'white',
//     textAlign: 'center'
//   },
//   processingBox: {
//     marginTop: 30,
//     backgroundColor: 'rgba(255,255,255,0.2)',
//     paddingHorizontal: 20,
//     paddingVertical: 10,
//     borderRadius: 20
//   },
//   processingText: {
//     color: 'white',
//     fontSize: 14,
//     fontWeight: 'bold'
//   },
//   rescanBtn: {
//     marginTop: 30,
//     backgroundColor: '#2196F3',
//     paddingHorizontal: 30,
//     paddingVertical: 12,
//     borderRadius: 25
//   },
//   rescanBtnText: {
//     color: 'white',
//     fontSize: 16,
//     fontWeight: 'bold'
//   },
//   errorText: {
//     fontSize: 16,
//     color: 'white',
//     textAlign: 'center',
//     marginBottom: 20
//   },
//   closeBtn: {
//     backgroundColor: '#F44336',
//     paddingHorizontal: 30,
//     paddingVertical: 12,
//     borderRadius: 25
//   },
//   closeBtnText: {
//     color: 'white',
//     fontSize: 16,
//     fontWeight: 'bold'
//   }
// });

// components/ui/QRScanner.tsx
import { Ionicons } from '@expo/vector-icons';
import { Camera, CameraView } from 'expo-camera'; // Dùng CameraView mới nhất của Expo
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../../firebaseConfig';

interface QRScannerProps {
  visible: boolean;
  onClose: () => void;
  bookingData?: any; // Dùng khi check-in cho booking đã đặt trước
  toiletData?: any;  // Dùng khi check-in kiểu Walk-in (chưa đặt)
  onSuccess?: () => void;
}

export default function QRScanner({ visible, onClose, bookingData, toiletData, onSuccess }: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    if (visible) {
      setScanned(false);
      setProcessing(false);
    }
  }, [visible]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processing) return;
    setScanned(true);
    setProcessing(true);

    try {
      console.log("Scanned Data:", data);
      
      // 1. Kiểm tra QR Code của cửa hàng
      // Quy ước mã QR dán tại tường: "STORE_{toiletId}"
      // Ví dụ: STORE_toilet_123
      const targetToiletId = bookingData ? bookingData.toiletId : toiletData?.id;
      const expectedPrefix = `STORE_`;

      if (!data.startsWith(expectedPrefix)) {
         throw new Error("Mã QR không hợp lệ! Vui lòng quét mã dán tại tường cửa hàng.");
      }

      const scannedToiletId = data.replace('STORE_', '');
      
      // Nếu đang check-in cho booking đặt trước, phải đúng cửa hàng đó
      if (targetToiletId && scannedToiletId !== targetToiletId) {
         throw new Error(`Bạn đang ở sai chỗ! Booking này dành cho: ${bookingData?.toiletName || toiletData?.name}`);
      }

      // Lấy thông tin Toilet ID từ QR nếu là walk-in mà không có data trước (trường hợp quét chung)
      const finalToiletId = targetToiletId || scannedToiletId;

      const user = auth.currentUser;
      const now = new Date().toISOString();

      if (bookingData) {
        // CASE A: Check-in cho Booking ĐÃ ĐẶT TRƯỚC
        // Cập nhật trạng thái booking sang checked_in
        const bookingRef = doc(db, 'bookings', bookingData.id);
        await updateDoc(bookingRef, {
          status: 'checked_in',
          checkInTime: now,
          updatedAt: now
        });
        
        // Nếu booking có chọn phòng cụ thể -> Cập nhật phòng thành occupied
        if (bookingData.roomId) {
            await updateDoc(doc(db, 'rooms', bookingData.roomId), {
                status: 'occupied',
                lastUpdated: now
            });
        }

        Alert.alert("✅ Check-in thành công", "Booking đã được kích hoạt. Chúc bạn thư giãn!");

      } else if (toiletData || scannedToiletId) {
        // CASE B: Walk-in (Đến nơi mới quét -> Tạo booking ngay)
        // Nếu không có toiletData (quét từ nút chung), cần query lấy info toilet (bỏ qua bước này cho đơn giản, giả sử luôn có toiletData từ modal chi tiết)
        
        const tData = toiletData || { id: scannedToiletId, name: 'Cửa hàng', address: 'Unknown', price: 0 }; 

        await addDoc(collection(db, 'bookings'), {
          userId: user?.uid,
          userName: user?.displayName || 'Khách vãng lai',
          toiletId: tData.id,
          toiletName: tData.name,
          toiletAddress: tData.address,
          roomNumber: 'Walk-in', // Hoặc random
          status: 'checked_in', // Vào thẳng trạng thái active
          bookingTime: now,
          checkInTime: now,
          totalPrice: tData.price || 0,
          paymentStatus: 'pending', // Chưa thanh toán
          type: 'walk_in'
        });
        
        Alert.alert("✅ Check-in thành công", "Đã tạo phiên sử dụng mới! Vui lòng thanh toán khi Check-out.");
      }

      onSuccess?.();
      onClose();

    } catch (error: any) {
      Alert.alert("Lỗi Check-in", error.message, [
        { text: "Quét lại", onPress: () => { setScanned(false); setProcessing(false); } }
      ]);
    }
  };

  if (hasPermission === null) return <View style={{flex:1, backgroundColor:'black'}} />;
  if (hasPermission === false) return <Text>Không có quyền truy cập camera</Text>;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Sử dụng CameraView mới thay cho BarCodeScanner cũ */}
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
        />
        
        <View style={styles.overlay}>
          <View style={styles.header}>
            <Text style={styles.title}>Quét mã QR Cửa Hàng</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.scanFrame} />
          
          <Text style={styles.instruction}>
            Di chuyển camera đến mã QR dán tại tường/quầy để Check-in
          </Text>
          <Text style={styles.subInstruction}>
             Mã hợp lệ: STORE_{bookingData?.toiletName || toiletData?.name || "..."}
          </Text>

          {processing && (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#2196F3" size="large" />
              <Text style={{color: 'white', marginTop: 10}}>Đang xử lý...</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  header: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  closeBtn: { padding: 10, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20 },
  scanFrame: { width: 260, height: 260, borderWidth: 2, borderColor: '#2196F3', backgroundColor: 'transparent', borderRadius: 20 },
  instruction: { color: 'white', marginTop: 30, textAlign: 'center', width: '80%', fontSize: 16, fontWeight: 'bold' },
  subInstruction: { color: '#ddd', marginTop: 10, textAlign: 'center', fontSize: 12 },
  loadingBox: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.8)', padding: 20, borderRadius: 10, alignItems: 'center' }
});