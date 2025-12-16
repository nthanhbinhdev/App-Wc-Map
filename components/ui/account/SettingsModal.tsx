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
// 👉 Import Hook từ context mình vừa tạo
import { useTheme } from "../../../contexts/ThemeContext";

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
  // 👉 Lấy theme, trạng thái tối, và hàm đổi màu từ kho tổng
  const { theme, isDarkMode, toggleTheme } = useTheme();

  // State cục bộ cho thông báo (cái này chưa có logic backend nên giữ local)
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.settingsContainer,
          { backgroundColor: theme.background },
        ]}
      >
        {/* Header */}
        <View
          style={[
            styles.modalHeader,
            { backgroundColor: theme.card, borderBottomColor: theme.border },
          ]}
        >
          <Text style={[styles.modalHeaderTitle, { color: theme.text }]}>
            Cài đặt
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.modalCloseBtn, { backgroundColor: theme.iconBg }]}
          >
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {/* --- Nhóm Chung --- */}
          <Text style={styles.settingGroupTitle}>Chung</Text>
          <View style={[styles.settingGroup, { backgroundColor: theme.card }]}>
            {/* Mục Thông báo */}
            <View
              style={[styles.settingItem, { borderBottomColor: theme.border }]}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="notifications-outline"
                  size={22}
                  color={theme.text}
                  style={{ marginRight: 10 }}
                />
                <Text style={[styles.settingText, { color: theme.text }]}>
                  Thông báo
                </Text>
              </View>
              <Switch
                value={isNotificationsEnabled}
                onValueChange={setIsNotificationsEnabled}
                trackColor={{ false: "#767577", true: theme.success }}
                thumbColor={Platform.OS === "android" ? "#f4f3f4" : undefined}
              />
            </View>

            {/* Mục Chế độ tối (Logic chính nằm ở đây) */}
            <View style={[styles.settingItem, { borderBottomWidth: 0 }]}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name={isDarkMode ? "moon" : "moon-outline"} // Đổi icon theo chế độ
                  size={22}
                  color={theme.text}
                  style={{ marginRight: 10 }}
                />
                <Text style={[styles.settingText, { color: theme.text }]}>
                  Chế độ tối
                </Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme} // 👉 Gọi hàm đổi theme toàn app
                trackColor={{ false: "#767577", true: theme.success }}
                thumbColor={Platform.OS === "android" ? "#f4f3f4" : undefined}
              />
            </View>
          </View>

          {/* --- Nhóm Tài khoản --- */}
          <Text style={styles.settingGroupTitle}>Tài khoản</Text>
          <View style={[styles.settingGroup, { backgroundColor: theme.card }]}>
            <TouchableOpacity
              style={[styles.settingItem, { borderBottomColor: theme.border }]}
              onPress={() => {
                onClose();
                onEditProfile();
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="person-outline"
                  size={22}
                  color={theme.text}
                  style={{ marginRight: 10 }}
                />
                <Text style={[styles.settingText, { color: theme.text }]}>
                  Thông tin cá nhân
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.subText}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, { borderBottomWidth: 0 }]}
              onPress={() =>
                Alert.alert("Thông báo", "Chức năng ngôn ngữ đang phát triển")
              }
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="language-outline"
                  size={22}
                  color={theme.text}
                  style={{ marginRight: 10 }}
                />
                <Text style={[styles.settingText, { color: theme.text }]}>
                  Ngôn ngữ
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ color: theme.subText, marginRight: 5 }}>
                  Tiếng Việt
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.subText}
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* --- Nhóm Hỗ trợ --- */}
          <Text style={styles.settingGroupTitle}>Hỗ trợ</Text>
          <View style={[styles.settingGroup, { backgroundColor: theme.card }]}>
            <TouchableOpacity
              style={[styles.settingItem, { borderBottomColor: theme.border }]}
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
                  color={theme.text}
                  style={{ marginRight: 10 }}
                />
                <Text style={[styles.settingText, { color: theme.text }]}>
                  Gửi phản hồi
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.subText}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, { borderBottomWidth: 0 }]}
              onPress={() => Alert.alert("Thông tin", "Phiên bản: 1.0.0")}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="information-circle-outline"
                  size={22}
                  color={theme.text}
                  style={{ marginRight: 10 }}
                />
                <Text style={[styles.settingText, { color: theme.text }]}>
                  Về ứng dụng
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.subText}
              />
            </TouchableOpacity>
          </View>

          <View style={{ height: 30 }} />

          <TouchableOpacity
            style={[
              styles.logoutBtn,
              { backgroundColor: theme.isDark ? "#3A1A1A" : "#FFEBEE" },
            ]}
            onPress={() => {
              onClose();
              onLogout();
            }}
          >
            <Text style={[styles.logoutText, { color: theme.danger }]}>
              Đăng xuất
            </Text>
          </TouchableOpacity>

          <Text style={[styles.versionText, { color: theme.subText }]}>
            Phiên bản 1.0.0
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  settingsContainer: {
    flex: 1,
    // Background color được set động trong component
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingTop: Platform.OS === "android" ? 40 : 20,
    borderBottomWidth: 1,
    justifyContent: "space-between",
  },
  modalCloseBtn: { padding: 8, borderRadius: 20 },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: "800",
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
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  settingText: {
    fontSize: 16,
  },
  logoutBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  logoutText: {
    fontWeight: "700",
    fontSize: 16,
  },
  versionText: {
    textAlign: "center",
    fontSize: 12,
    marginBottom: 20,
  },
});
