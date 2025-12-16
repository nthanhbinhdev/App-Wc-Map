import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker"; // Import ImagePicker
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (
    name: string,
    photoURL: string,
    phone: string,
    imageUri: string | null
  ) => Promise<void>;
  user: any;
  newName: string;
  setNewName: (text: string) => void;
  newPhotoURL: string;
  setNewPhotoURL: (text: string) => void;
  newPhone: string;
  setNewPhone: (text: string) => void;
}

export default function EditProfileModal({
  visible,
  onClose,
  onSave,
  user,
  newName,
  setNewName,
  newPhotoURL,
  setNewPhotoURL,
  newPhone,
  setNewPhone,
}: EditProfileModalProps) {
  const [uploading, setUploading] = useState(false);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Cần quyền truy cập thư viện ảnh để thay đổi avatar!");
      return;
    }

    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        // Quay về dùng MediaTypeOptions để tránh lỗi undefined trên một số phiên bản
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        setLocalImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.log("Lỗi chọn ảnh:", error);
    }
  };

  const handleSavePress = async () => {
    setUploading(true);
    try {
      await onSave(newName, newPhotoURL, newPhone, localImageUri);
      setLocalImageUri(null);
    } catch (error) {
      console.error("Lỗi khi lưu profile:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderSimple}>
              <Text style={styles.modalTitle}>Chỉnh sửa hồ sơ</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeIconBtn}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.avatarEditContainer}>
              <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
                <Image
                  source={{
                    uri:
                      localImageUri ||
                      newPhotoURL ||
                      user?.photoURL ||
                      `https://ui-avatars.com/api/?name=${
                        user?.displayName || "User"
                      }&background=random`,
                  }}
                  style={styles.avatarLargeEdit}
                />
                <View style={styles.cameraIconBadge}>
                  <Ionicons name="camera" size={18} color="white" />
                </View>
              </TouchableOpacity>
              <Text style={styles.changePhotoText}>Chạm để đổi ảnh</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Tên hiển thị <Text style={{ color: "red" }}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={newName}
                onChangeText={setNewName}
                placeholder="Nhập tên hiển thị..."
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Số điện thoại</Text>
              <TextInput
                style={styles.input}
                value={newPhone}
                onChangeText={setNewPhone}
                placeholder="Nhập số điện thoại..."
                keyboardType="phone-pad"
              />
            </View>

            <TouchableOpacity
              onPress={handleSavePress}
              style={[styles.saveBtn, uploading && { opacity: 0.7 }]}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.saveBtnText}>Lưu thay đổi</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    padding: 24,
    borderRadius: 24,
    elevation: 10,
  },
  modalHeaderSimple: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    position: "relative",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    color: "#333",
  },
  closeIconBtn: {
    position: "absolute",
    right: 0,
    padding: 5,
  },
  avatarEditContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatarLargeEdit: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "#E0E0E0",
  },
  cameraIconBadge: {
    position: "absolute",
    bottom: 10,
    right: 0,
    backgroundColor: "#2196F3",
    padding: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "white",
  },
  changePhotoText: {
    color: "#2196F3",
    fontWeight: "600",
    fontSize: 13,
  },
  inputGroup: {
    marginBottom: 15,
    width: "100%",
  },
  label: {
    fontSize: 14,
    color: "#555",
    marginBottom: 5,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: "#F9F9F9",
    color: "#333",
    width: "100%",
  },
  saveBtn: {
    backgroundColor: "#2196F3",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  saveBtnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});