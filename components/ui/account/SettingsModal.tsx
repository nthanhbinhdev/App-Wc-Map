import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
  onEditProfile: () => void;
}

export default function SettingsModal({
  visible,
  onClose,
  onLogout,
  onEditProfile,
}: SettingsModalProps) {
  // Settings states (Giả lập)
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.settingsContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalHeaderTitle}>Cài đặt</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {/* Nhóm Chung */}
          <Text style={styles.settingGroupTitle}>Chung</Text>
          <View style={styles.settingGroup}>
            <View style={styles.settingItem}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="notifications-outline"
                  size={22}
                  color="#555"
                  style={{ marginRight: 10 }}
                />
                <Text style={styles.settingText}>Thông báo</Text>
              </View>
              <Switch
                value={isNotificationsEnabled}
                onValueChange={setIsNotificationsEnabled}
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={isNotificationsEnabled ? "#2196F3" : "#f4f3f4"}
              />
            </View>
            <View style={[styles.settingItem, { borderBottomWidth: 0 }]}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="moon-outline"
                  size={22}
                  color="#555"
                  style={{ marginRight: 10 }}
                />
                <Text style={styles.settingText}>Chế độ tối</Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={setIsDarkMode}
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={isDarkMode ? "#2196F3" : "#f4f3f4"}
              />
            </View>
          </View>

          {/* Nhóm Tài khoản */}
          <Text style={styles.settingGroupTitle}>Tài khoản</Text>
          <View style={styles.settingGroup}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => {
                onClose();
                onEditProfile();
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="person-outline"
                  size={22}
                  color="#555"
                  style={{ marginRight: 10 }}
                />
                <Text style={styles.settingText}>Thông tin cá nhân</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() =>
                Alert.alert("Thông báo", "Chức năng ngôn ngữ đang phát triển")
              }
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="language-outline"
                  size={22}
                  color="#555"
                  style={{ marginRight: 10 }}
                />
                <Text style={styles.settingText}>Ngôn ngữ</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ color: "#888", marginRight: 5 }}>Tiếng Việt</Text>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Nhóm Hỗ trợ */}
          <Text style={styles.settingGroupTitle}>Hỗ trợ</Text>
          <View style={styles.settingGroup}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() =>
                Alert.alert(
                  "Liên hệ",
                  "Email: support@wcmap.vn\nHotline: 1900 xxxx"
                )
              }
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="mail-outline"
                  size={22}
                  color="#555"
                  style={{ marginRight: 10 }}
                />
                <Text style={styles.settingText}>Gửi phản hồi</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.settingItem, { borderBottomWidth: 0 }]}
              onPress={() => Alert.alert("Thông tin", "Phiên bản: 1.0.0")}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="information-circle-outline"
                  size={22}
                  color="#555"
                  style={{ marginRight: 10 }}
                />
                <Text style={styles.settingText}>Về ứng dụng</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          </View>

          <View style={{ height: 30 }} />
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => {
              onClose();
              onLogout();
            }}
          >
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>
          <Text style={styles.versionText}>Phiên bản 1.0.0</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  settingsContainer: {
    flex: 1,
    backgroundColor: "#F2F2F7", // Màu nền kiểu iOS Setting
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingTop: Platform.OS === "android" ? 40 : 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
    justifyContent: "space-between",
  },
  modalCloseBtn: { padding: 8, borderRadius: 20, backgroundColor: "#F5F5F5" },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#333",
  },
  settingGroupTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 10,
    textTransform: "uppercase",
  },
  settingGroup: {
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  settingText: {
    fontSize: 16,
    color: "#333",
  },
  logoutBtn: {
    backgroundColor: "#FFEBEE",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  logoutText: {
    color: "#D32F2F",
    fontWeight: "700",
    fontSize: 16,
  },
  versionText: {
    textAlign: "center",
    color: "#999",
    fontSize: 12,
    marginBottom: 20,
  },
});