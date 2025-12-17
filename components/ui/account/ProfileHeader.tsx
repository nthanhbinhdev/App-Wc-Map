import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Alert,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// 👉 Import Hook lấy theme
import { useTheme } from "../../../contexts/ThemeContext";

interface ProfileHeaderProps {
  user: any;
  stats: { count: number };
  onEditProfile: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  onChangePassword: () => void;
}

export default function ProfileHeader({
  user,
  stats,
  onEditProfile,
  onOpenSettings,
  onLogout,
  onChangePassword,
}: ProfileHeaderProps) {
  // 👉 Lấy bộ màu hiện tại (Sáng/Tối) từ Context
  const { theme } = useTheme();

  return (
    // Áp dụng màu nền và shadow động
    <View
      style={[
        styles.profileHeader,
        { backgroundColor: theme.card, shadowColor: "#000" },
      ]}
    >
      {/* User Info Row */}
      <View style={styles.userInfoRow}>
        <Image
          source={{
            uri:
              user?.photoURL ||
              `https://ui-avatars.com/api/?name=${
                user?.displayName || "User"
              }&background=random`,
          }}
          style={styles.avatarLarge}
        />
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text style={[styles.nameLarge, { color: theme.text }]}>
            {user?.displayName || "Người dùng"}
          </Text>
          <Text style={[styles.emailLabel, { color: theme.subText }]}>
            {user?.email}
          </Text>
          <View
            style={[styles.roleBadge, { backgroundColor: theme.background }]}
          >
            <Ionicons name="person" size={12} color={theme.primary} />
            <Text style={[styles.roleText, { color: theme.primary }]}>
              Thành viên thân thiện
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.editIconBtn, { backgroundColor: theme.iconBg }]}
          onPress={onOpenSettings}
        >
          <Ionicons name="settings-outline" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View
        style={[styles.statsContainer, { backgroundColor: theme.background }]}
      >
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: theme.text }]}>
            {stats.count}
          </Text>
          <Text style={styles.statLabel}>Lượt trải nghiệm</Text>
        </View>
        {/* Divider đổi màu theo theme */}
        <View
          style={[styles.verticalDivider, { backgroundColor: theme.divider }]}
        />
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: theme.text }]}>0</Text>
          <Text style={styles.statLabel}>Điểm thưởng</Text>
        </View>
      </View>

      {/* Action Grid */}
      <View style={styles.actionGrid}>
        <TouchableOpacity style={styles.actionItem} onPress={onEditProfile}>
          <View
            style={[styles.actionIconCircle, { backgroundColor: theme.iconBg }]}
          >
            <Ionicons name="create-outline" size={20} color={theme.primary} />
          </View>
          <Text style={[styles.actionItemText, { color: theme.subText }]}>
            Sửa hồ sơ
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={onChangePassword}>
          <View
            style={[styles.actionIconCircle, { backgroundColor: theme.iconBg }]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={theme.warning}
            />
          </View>
          <Text style={[styles.actionItemText, { color: theme.subText }]}>
            Đổi mật khẩu
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => Alert.alert("Ví của tôi", "Số dư: 0 VND")}
        >
          <View
            style={[styles.actionIconCircle, { backgroundColor: theme.iconBg }]}
          >
            <Ionicons name="wallet-outline" size={20} color={theme.success} />
          </View>
          <Text style={[styles.actionItemText, { color: theme.subText }]}>
            Ví của tôi
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={onLogout}>
          <View
            style={[styles.actionIconCircle, { backgroundColor: theme.iconBg }]}
          >
            <Ionicons name="log-out-outline" size={20} color={theme.danger} />
          </View>
          <Text style={[styles.actionItemText, { color: theme.subText }]}>
            Đăng xuất
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    paddingHorizontal: 20,
    // Logic tính padding top giữ nguyên cho Android
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 20,
    paddingBottom: 20,
    marginBottom: 10,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    elevation: 4,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    
  },
  userInfoRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  avatarLarge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 15,
    borderWidth: 1,
    borderColor: "#f5f5f5",
  },
  nameLarge: { fontSize: 28, fontWeight: "800", marginBottom: 0 },
  emailLabel: { fontSize: 13, marginBottom: 6, paddingLeft: 2 },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 2,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  roleText: { fontWeight: "700", fontSize: 13, marginLeft: 0 },
  editIconBtn: { padding: 10, borderRadius: 50 },
  statsContainer: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 15,
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 20,
  },
  statBox: { alignItems: "center", flex: 1 },
  statNumber: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 12, color: "#888", marginTop: 2 },
  verticalDivider: { width: 1, height: 30 },
  actionGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 5,
  },
  actionItem: {
    alignItems: "center",
    width: 70,
  },
  actionIconCircle: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  actionItemText: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
});
