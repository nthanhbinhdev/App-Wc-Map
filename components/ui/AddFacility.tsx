import { Ionicons } from "@expo/vector-icons";
import { addDoc, collection } from "firebase/firestore";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../firebaseConfig";

export default function AddFacilityFlow() {
  const [currentStep, setCurrentStep] = useState(1);

  // Bước 1: Thông tin địa điểm
  const [facilityName, setFacilityName] = useState("");
  const [address, setAddress] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  // Bước 2: Danh sách phòng
  const [rooms, setRooms] = useState<any[]>([]);
  const [tempRoom, setTempRoom] = useState({
    roomNumber: "",
    type: "single",
    price: "",
  });

  const [submitting, setSubmitting] = useState(false);

  // Danh sách tiện ích
  const AMENITIES_LIST = [
    { id: "hot_water", name: "Nước nóng", icon: "water" },
    { id: "towel", name: "Khăn tắm", icon: "shirt" },
    { id: "soap", name: "Dầu gội/Sữa tắm", icon: "sparkles" },
    { id: "hair_dryer", name: "Máy sấy", icon: "flash" },
    { id: "locker", name: "Tủ đồ", icon: "lock-closed" },
    { id: "parking", name: "Gửi xe", icon: "bicycle" },
    { id: "wifi", name: "Wifi", icon: "wifi" },
    { id: "sauna", name: "Xông hơi", icon: "cloud" },
  ];

  const ROOM_TYPES = [
    { value: "single", label: "🚿 Đơn" },
    { value: "couple", label: "💑 Đôi" },
    { value: "family", label: "👨‍👩‍👧 Gia đình" },
  ];

  const toggleAmenity = (id: string) => {
    if (selectedAmenities.includes(id)) {
      setSelectedAmenities(selectedAmenities.filter((item) => item !== id));
    } else {
      setSelectedAmenities([...selectedAmenities, id]);
    }
  };

  const handleStep1Next = () => {
    if (!facilityName.trim() || !address.trim() || !basePrice) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin!");
      return;
    }
    setCurrentStep(2);
  };

  const handleAddRoom = () => {
    if (!tempRoom.roomNumber || !tempRoom.price) {
      Alert.alert("Lỗi", "Vui lòng nhập số phòng và giá!");
      return;
    }

    if (rooms.some((r) => r.roomNumber === tempRoom.roomNumber)) {
      Alert.alert("Lỗi", "Số phòng đã tồn tại!");
      return;
    }

    setRooms([...rooms, { ...tempRoom, id: Date.now() }]);
    setTempRoom({ roomNumber: "", type: "single", price: "" });
  };

  const handleDeleteRoom = (id: number) => {
    setRooms(rooms.filter((r) => r.id !== id));
  };

  const handleStep2Next = () => {
    if (rooms.length === 0) {
      Alert.alert("Lỗi", "Phải thêm ít nhất 1 phòng!");
      return;
    }
    setCurrentStep(3);
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);

    try {
      const user = auth.currentUser;

      // 1. Tạo địa điểm
      const facilityData = {
        name: facilityName.trim(),
        address: address.trim(),
        price: Number(basePrice),
        amenities: selectedAmenities,
        createdBy: user?.email || "unknown",
        status: "pending", // Chờ admin duyệt
        rating: 5.0,
        ratingCount: 0,
        latitude: 10.7769 + (Math.random() * 0.02 - 0.01), // Random tạm
        longitude: 106.7009 + (Math.random() * 0.02 - 0.01),
        type: "bathhouse",
        createdAt: new Date().toISOString(),
      };

      const facilityRef = await addDoc(collection(db, "toilets"), facilityData);

      // 2. Tạo các phòng
      const roomPromises = rooms.map((room) =>
        addDoc(collection(db, "rooms"), {
          toiletId: facilityRef.id,
          toiletName: facilityName.trim(),
          roomNumber: room.roomNumber,
          type: room.type,
          status: "available",
          price: Number(room.price),
          amenities: ["hot_water", "towel", "soap"],
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        })
      );

      await Promise.all(roomPromises);

      Alert.alert(
        "✅ Thành công!",
        `Đã tạo địa điểm "${facilityName}" với ${rooms.length} phòng.\n\nĐịa điểm sẽ hiển thị sau khi Admin phê duyệt.`,
        [{ text: "OK", onPress: resetForm }]
      );
    } catch (error: any) {
      Alert.alert("Lỗi", error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFacilityName("");
    setAddress("");
    setBasePrice("");
    setSelectedAmenities([]);
    setRooms([]);
    setCurrentStep(1);
  };

  // ==================== RENDER ====================

  const renderStepper = () => (
    <View style={styles.stepperContainer}>
      {[1, 2, 3].map((step) => (
        <View key={step} style={styles.stepItem}>
          <View
            style={[
              styles.stepCircle,
              { backgroundColor: currentStep >= step ? "#2196F3" : "#E0E0E0" },
            ]}
          >
            <Text
              style={[
                styles.stepCircleText,
                { color: currentStep >= step ? "white" : "#999" },
              ]}
            >
              {currentStep > step ? "✓" : step}
            </Text>
          </View>
          <Text style={styles.stepLabel}>
            {step === 1 ? "Thông tin" : step === 2 ? "Phòng" : "Xác nhận"}
          </Text>
          {step < 3 && (
            <View
              style={[
                styles.stepLine,
                { backgroundColor: currentStep > step ? "#2196F3" : "#E0E0E0" },
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>📍 Thông tin địa điểm</Text>

      <Text style={styles.label}>Tên cơ sở *</Text>
      <TextInput
        style={styles.input}
        placeholder="VD: Bath Station Quận 1"
        value={facilityName}
        onChangeText={setFacilityName}
      />

      <Text style={styles.label}>Địa chỉ *</Text>
      <TextInput
        style={styles.input}
        placeholder="VD: 123 Nguyễn Huệ, Q1"
        value={address}
        onChangeText={setAddress}
      />

      <Text style={styles.label}>Giá cơ bản (VNĐ) *</Text>
      <TextInput
        style={styles.input}
        placeholder="VD: 30000"
        keyboardType="numeric"
        value={basePrice}
        onChangeText={setBasePrice}
      />

      <Text style={styles.label}>Tiện ích</Text>
      <View style={styles.amenitiesGrid}>
        {AMENITIES_LIST.map((amenity) => {
          const isSelected = selectedAmenities.includes(amenity.id);
          return (
            <TouchableOpacity
              key={amenity.id}
              onPress={() => toggleAmenity(amenity.id)}
              style={[
                styles.amenityChip,
                isSelected && styles.amenityChipActive,
              ]}
            >
              <Ionicons
                name={amenity.icon as any}
                size={16}
                color={isSelected ? "white" : "#666"}
              />
              <Text
                style={[
                  styles.amenityText,
                  isSelected && styles.amenityTextActive,
                ]}
              >
                {amenity.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity onPress={handleStep1Next} style={styles.btnPrimary}>
        <Text style={styles.btnPrimaryText}>Tiếp theo: Thêm phòng →</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>🚪 Thêm danh sách phòng</Text>

      <View style={styles.addRoomForm}>
        <TextInput
          style={styles.inputSmall}
          placeholder="Số phòng (VD: 101)"
          value={tempRoom.roomNumber}
          onChangeText={(text) =>
            setTempRoom({ ...tempRoom, roomNumber: text })
          }
        />

        <View style={styles.typeSelector}>
          {ROOM_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              onPress={() => setTempRoom({ ...tempRoom, type: type.value })}
              style={[
                styles.typeBtn,
                tempRoom.type === type.value && styles.typeBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.typeText,
                  tempRoom.type === type.value && styles.typeTextActive,
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.inputSmall}
          placeholder="Giá phòng (VD: 50000)"
          keyboardType="numeric"
          value={tempRoom.price}
          onChangeText={(text) => setTempRoom({ ...tempRoom, price: text })}
        />

        <TouchableOpacity onPress={handleAddRoom} style={styles.btnAdd}>
          <Text style={styles.btnAddText}>➕ Thêm phòng</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.roomsListTitle}>Đã thêm: {rooms.length} phòng</Text>
      {rooms.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            Chưa có phòng. Vui lòng thêm ít nhất 1 phòng.
          </Text>
        </View>
      ) : (
        rooms.map((room) => (
          <View key={room.id} style={styles.roomCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.roomNumber}>Phòng {room.roomNumber}</Text>
              <Text style={styles.roomDetail}>
                {ROOM_TYPES.find((t) => t.value === room.type)?.label} •{" "}
                {Number(room.price).toLocaleString()}đ
              </Text>
            </View>
            <TouchableOpacity onPress={() => handleDeleteRoom(room.id)}>
              <Ionicons name="trash-outline" size={20} color="#F44336" />
            </TouchableOpacity>
          </View>
        ))
      )}

      <View style={styles.btnRow}>
        <TouchableOpacity
          onPress={() => setCurrentStep(1)}
          style={styles.btnSecondary}
        >
          <Text style={styles.btnSecondaryText}>← Quay lại</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleStep2Next} style={styles.btnPrimary}>
          <Text style={styles.btnPrimaryText}>Tiếp theo →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text style={styles.stepTitle}>✅ Xác nhận thông tin</Text>

      <View style={styles.reviewBox}>
        <Text style={styles.reviewTitle}>📍 Địa điểm</Text>
        <Text style={styles.reviewText}>Tên: {facilityName}</Text>
        <Text style={styles.reviewText}>Địa chỉ: {address}</Text>
        <Text style={styles.reviewText}>
          Giá: {Number(basePrice).toLocaleString()}đ
        </Text>
      </View>

      <View style={styles.reviewBox}>
        <Text style={styles.reviewTitle}>🚪 Phòng ({rooms.length})</Text>
        {rooms.map((room) => (
          <Text key={room.id} style={styles.reviewRoomText}>
            • Phòng {room.roomNumber} - {Number(room.price).toLocaleString()}đ
          </Text>
        ))}
      </View>

      <View style={styles.warningBox}>
        <Text style={styles.warningText}>
          ⚠️ Địa điểm sẽ chờ Admin phê duyệt trước khi công khai
        </Text>
      </View>

      <View style={styles.btnRow}>
        <TouchableOpacity
          onPress={() => setCurrentStep(2)}
          style={styles.btnSecondary}
        >
          <Text style={styles.btnSecondaryText}>← Sửa</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleFinalSubmit}
          disabled={submitting}
          style={[styles.btnSuccess, submitting && { opacity: 0.6 }]}
        >
          <Text style={styles.btnSuccessText}>
            {submitting ? "⏳ Đang xử lý..." : "🎉 Hoàn tất"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thêm Địa Điểm Mới</Text>
        <Text style={styles.headerSubtitle}>
          Điền thông tin và thêm phòng trong một lần
        </Text>
      </View>

      {renderStepper()}

      <View style={styles.card}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },

  // Stepper
  stepperContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  stepItem: {
    flex: 1,
    alignItems: "center",
    position: "relative",
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  stepCircleText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  stepLabel: {
    fontSize: 11,
    color: "#666",
    fontWeight: "600",
  },
  stepLine: {
    position: "absolute",
    top: 20,
    left: "50%",
    width: "100%",
    height: 2,
    zIndex: -1,
  },

  // Card
  card: {
    backgroundColor: "white",
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },

  // Form
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputSmall: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginBottom: 10,
  },

  // Amenities
  amenitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  amenityChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#DDD",
    gap: 6,
  },
  amenityChipActive: {
    backgroundColor: "#2196F3",
    borderColor: "#2196F3",
  },
  amenityText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },
  amenityTextActive: {
    color: "white",
  },

  // Room Form
  addRoomForm: {
    backgroundColor: "#F9F9F9",
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  typeSelector: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  typeBtn: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#DDD",
    alignItems: "center",
  },
  typeBtnActive: {
    backgroundColor: "#2196F3",
    borderColor: "#2196F3",
  },
  typeText: {
    fontSize: 11,
    color: "#666",
    fontWeight: "600",
  },
  typeTextActive: {
    color: "white",
  },
  roomsListTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
  },
  roomCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  roomNumber: {
    fontSize: 15,
    fontWeight: "bold",
  },
  roomDetail: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  emptyBox: {
    padding: 30,
    backgroundColor: "#FAFAFA",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#DDD",
    borderStyle: "dashed",
    alignItems: "center",
  },
  emptyText: {
    color: "#999",
    textAlign: "center",
  },

  // Review
  reviewBox: {
    backgroundColor: "#F9F9F9",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  reviewTitle: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 8,
  },
  reviewText: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  reviewRoomText: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  warningBox: {
    backgroundColor: "#FFF3E0",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFE0B2",
    marginBottom: 15,
  },
  warningText: {
    fontSize: 12,
    color: "#E65100",
  },

  // Buttons
  btnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  btnPrimary: {
    backgroundColor: "#2196F3",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
    flex: 1,
  },
  btnPrimaryText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  btnSecondary: {
    backgroundColor: "#F5F5F5",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDD",
    flex: 1,
  },
  btnSecondaryText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "bold",
  },
  btnSuccess: {
    backgroundColor: "#4CAF50",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    flex: 2,
  },
  btnSuccessText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  btnAdd: {
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  btnAddText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
});
