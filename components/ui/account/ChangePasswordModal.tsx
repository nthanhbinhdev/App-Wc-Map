import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
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

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (currentPass: string, newPass: string) => Promise<void>;
}

export default function ChangePasswordModal({
  visible,
  onClose,
  onSave,
}: ChangePasswordModalProps) {
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setError("");
    if (!currentPass || !newPass || !confirmPass) {
      setError("Vui lòng điền đầy đủ thông tin");
      return;
    }
    if (newPass !== confirmPass) {
      setError("Mật khẩu mới không khớp");
      return;
    }
    if (newPass.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    try {
      setLoading(true);
      await onSave(currentPass, newPass);
      // Reset form sau khi thành công
      setCurrentPass("");
      setNewPass("");
      setConfirmPass("");
    } catch (err: any) {
      setError(err.message || "Đổi mật khẩu thất bại");
    } finally {
      setLoading(false);
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
            <View style={styles.header}>
              <Text style={styles.title}>Đổi mật khẩu</Text>
              <TouchableOpacity onPress={onClose} disabled={loading}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Mật khẩu hiện tại */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mật khẩu hiện tại</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.inputPass}
                  value={currentPass}
                  onChangeText={setCurrentPass}
                  secureTextEntry={!showCurrentPass}
                  placeholder="Nhập mật khẩu cũ..."
                  placeholderTextColor="#999"
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowCurrentPass(!showCurrentPass)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showCurrentPass ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#888"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Mật khẩu mới */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mật khẩu mới</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.inputPass}
                  value={newPass}
                  onChangeText={setNewPass}
                  secureTextEntry={!showNewPass}
                  placeholder="Nhập mật khẩu mới..."
                  placeholderTextColor="#999"
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowNewPass(!showNewPass)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showNewPass ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#888"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Nhập lại mật khẩu mới */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.inputPass}
                  value={confirmPass}
                  onChangeText={setConfirmPass}
                  secureTextEntry={!showNewPass}
                  placeholder="Nhập lại mật khẩu mới..."
                  placeholderTextColor="#999"
                  editable={!loading}
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSave}
              style={[styles.saveBtn, loading && { opacity: 0.7 }]}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.saveBtnText}>Cập nhật mật khẩu</Text>
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
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: "800", color: "#333" },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 14, color: "#555", marginBottom: 5, fontWeight: "600" },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    backgroundColor: "#F9F9F9",
  },
  inputPass: { flex: 1, padding: 14, fontSize: 16, color: "#333" },
  eyeIcon: { padding: 10 },
  saveBtn: {
    backgroundColor: "#FF9800",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  saveBtnText: { color: "white", fontWeight: "bold", fontSize: 16 },
  errorText: {
    color: "#D32F2F",
    marginBottom: 10,
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
});