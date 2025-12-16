import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
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
  onSave: () => void;
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
              <Image
                source={{
                  uri:
                    newPhotoURL ||
                    user?.photoURL ||
                    `https://ui-avatars.com/api/?name=${user?.displayName || "User"}&background=random`,
                }}
                style={styles.avatarLargeEdit}
              />
              {/* Tạm thời chỉ cho nhập link ảnh */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Link ảnh đại diện</Text>
                <TextInput
                  style={styles.input}
                  value={newPhotoURL}
                  onChangeText={setNewPhotoURL}
                  placeholder="https://..."
                />
              </View>
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

            <TouchableOpacity onPress={onSave} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Lưu thay đổi</Text>
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
  avatarLargeEdit: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "#E0E0E0",
  },
  inputGroup: {
    marginBottom: 15,
    width: '100%',
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
    width: '100%',
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