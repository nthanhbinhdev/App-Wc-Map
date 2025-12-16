import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ProfileHeaderProps {
  user: any;
  stats: { count: number };
  onEditProfile: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export default function ProfileHeader({
  user,
  stats,
  onEditProfile,
  onOpenSettings,
  onLogout,
}: ProfileHeaderProps) {
  return (
    <View style={styles.profileHeader}>
      {/* User Info Row */}
      <View style={styles.userInfoRow}>
        <Image
          source={{
            uri:
              user?.photoURL ||
              `https://ui-avatars.com/api/?name=${user?.displayName || "User"}&background=random`,
          }}
          style={styles.avatarLarge}
        />
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text style={styles.nameLarge}>
            {user?.displayName || "Người dùng"}
          </Text>
          <Text style={styles.emailLabel}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="person" size={12} color="#1565C0" />
            <Text style={styles.roleText}>Thành viên thân thiết</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.editIconBtn}
          onPress={onOpenSettings}
        >
          <Ionicons name="settings-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{stats.count}</Text>
          <Text style={styles.statLabel}>Lượt trải nghiệm</Text>
        </View>
        <View style={styles.verticalDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Điểm thưởng</Text>
        </View>
      </View>

      {/* Action Grid */}
      <View style={styles.actionGrid}>
        <TouchableOpacity style={styles.actionItem} onPress={onEditProfile}>
          <View style={[styles.actionIconCircle, { backgroundColor: "#E3F2FD" }]}>
            <Ionicons name="create-outline" size={20} color="#1565C0" />
          </View>
          <Text style={styles.actionItemText}>Sửa hồ sơ</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => Alert.alert("Sắp ra mắt", "Chức năng đổi mật khẩu đang phát triển")}
        >
          <View style={[styles.actionIconCircle, { backgroundColor: "#FFF3E0" }]}>
            <Ionicons name="lock-closed-outline" size={20} color="#E65100" />
          </View>
          <Text style={styles.actionItemText}>Đổi mật khẩu</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => Alert.alert("Ví của tôi", "Số dư: 0 VND")}
        >
          <View style={[styles.actionIconCircle, { backgroundColor: "#E8F5E9" }]}>
            <Ionicons name="wallet-outline" size={20} color="#2E7D32" />
          </View>
          <Text style={styles.actionItemText}>Ví của tôi</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={onLogout}>
          <View style={[styles.actionIconCircle, { backgroundColor: "#FFEBEE" }]}>
            <Ionicons name="log-out-outline" size={20} color="#C62828" />
          </View>
          <Text style={styles.actionItemText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingTop: 20, 
    paddingBottom: 20,
    marginBottom: 10,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  userInfoRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  avatarLarge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 15,
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  nameLarge: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  emailLabel: { fontSize: 13, color: "#666", marginBottom: 6 },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  roleText: {
    color: "#1565C0",
    fontWeight: "700",
    fontSize: 11,
    marginLeft: 4,
  },
  editIconBtn: { padding: 10, backgroundColor: "#F5F5F5", borderRadius: 50 },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    padding: 15,
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 20,
  },
  statBox: { alignItems: "center", flex: 1 },
  statNumber: { fontSize: 20, fontWeight: "800", color: "#333" },
  statLabel: { fontSize: 12, color: "#888", marginTop: 2 },
  verticalDivider: { width: 1, height: 30, backgroundColor: "#DDD" },
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
    color: "#555",
    fontWeight: "500",
    textAlign: "center",
  },
});