import { Ionicons } from "@expo/vector-icons";
import { Camera, CameraView } from "expo-camera";
import { doc, updateDoc } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../firebaseConfig";

interface QRScannerProps {
  visible: boolean;
  onClose: () => void;
  bookingData?: any; // Dùng khi check-in cho booking đã đặt trước
  toiletData?: any; // Dùng khi check-in kiểu Walk-in (chưa đặt)
  onSuccess?: (scannedId?: string) => void;
}

export default function QRScanner({
  visible,
  onClose,
  bookingData,
  toiletData,
  onSuccess,
}: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    (async () => {
      // Check quyền Camera
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  useEffect(() => {
    if (visible) {
      setScanned(false);
      setProcessing(false);
    }
  }, [visible]);

  const processingRef = useRef(false);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (processingRef.current) return;
    processingRef.current = true;

    setScanned(true);
    setProcessing(true);

    try {
      console.log("Scanned Data:", data);

      // 1. Kiểm tra định dạng QR Code: "STORE_{toiletId}"
      const expectedPrefix = `STORE_`;
      if (!data.startsWith(expectedPrefix)) {
        throw new Error(
          "Mã QR không hợp lệ! Vui lòng quét mã dán tại tường cửa hàng."
        );
      }

      const scannedToiletId = data.replace("STORE_", "");

      // 2. Kiểm tra khớp địa điểm (nếu có dữ liệu đầu vào từ trước)
      const targetToiletId = bookingData
        ? bookingData.toiletId
        : toiletData?.id;

      // Nếu đang check-in cho booking đặt trước hoặc đang xem chi tiết 1 toilet cụ thể, phải quét đúng mã của toilet đó
      if (targetToiletId && scannedToiletId !== targetToiletId) {
        throw new Error(
          `Bạn đang ở sai chỗ! Booking này dành cho: ${
            bookingData?.toiletName || toiletData?.name
          }`
        );
      }

      // 3. Xử lý Logic
      if (bookingData) {
        // CASE A: Check-in cho Booking ĐÃ ĐẶT TRƯỚC
        const now = new Date().toISOString();
        const bookingRef = doc(db, "bookings", bookingData.id);

        await updateDoc(bookingRef, {
          status: "checked_in",
          checkInTime: now,
          updatedAt: now,
        });

        // Nếu booking có chọn phòng cụ thể -> Cập nhật phòng thành occupied
        if (bookingData.roomId && bookingData.roomId !== "general") {
          await updateDoc(doc(db, "rooms", bookingData.roomId), {
            status: "occupied",
            lastUpdated: now,
          });
        }

        Alert.alert(
          "Check-in thành công",
          "Booking đã được kích hoạt. Chúc bạn thư giãn!"
        );

        // Callback về cha (reload list, v.v.)
        onSuccess?.(scannedToiletId);
      } else {
        // CASE B: Walk-in (Khách vãng lai)
        console.log("Walk-in detected for ID:", scannedToiletId);

        if (onSuccess) {
          onSuccess(scannedToiletId);
        } else {
          Alert.alert("Đã quét mã", "Vui lòng chọn dịch vụ để tiếp tục.");
        }
      }

      onClose();
    } catch (error: any) {
      Alert.alert("Lỗi Check-in", error.message, [
        {
          text: "Quét lại",
          onPress: () => {
            setScanned(false);
            setProcessing(false);
          },
        },
      ]);
    } finally {
      processingRef.current = false;
      setProcessing(false);
    }
  };

  if (hasPermission === null)
    return <View style={{ flex: 1, backgroundColor: "black" }} />;
  if (hasPermission === false)
    return (
      <Text style={{ color: "white", padding: 50 }}>
        Không có quyền truy cập camera
      </Text>
    );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
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
            Mã hợp lệ: STORE_
            {bookingData?.toiletName || toiletData?.name || "..."}
          </Text>

          {processing && (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#2196F3" size="large" />
              <Text style={{ color: "white", marginTop: 10 }}>
                Đang xử lý...
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { color: "white", fontSize: 18, fontWeight: "bold" },
  closeBtn: {
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 20,
  },
  scanFrame: {
    width: 260,
    height: 260,
    borderWidth: 2,
    borderColor: "#2196F3",
    backgroundColor: "transparent",
    borderRadius: 20,
  },
  instruction: {
    color: "white",
    marginTop: 30,
    textAlign: "center",
    width: "80%",
    fontSize: 16,
    fontWeight: "bold",
  },
  subInstruction: {
    color: "#ddd",
    marginTop: 10,
    textAlign: "center",
    fontSize: 12,
  },
  loadingBox: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
});
