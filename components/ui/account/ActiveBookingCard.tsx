import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
// 👉 Import hook để lấy theme
import { useTheme } from "../../../contexts/ThemeContext";

interface ActiveBookingCardProps {
  booking: any;
  onPress: () => void;
}

export default function ActiveBookingCard({
  booking,
  onPress,
}: ActiveBookingCardProps) {
  // 👉 Lấy theme và trạng thái dark mode
  const { theme, isDarkMode } = useTheme();

  if (!booking) return null;

  return (
    <View style={styles.sectionContainer}>
      {/* Tiêu đề đổi màu theo theme */}
      <Text style={[styles.sectionHeaderTitle, { color: theme.text }]}>
        Hoạt động hiện tại
      </Text>
      <TouchableOpacity
        style={[
          styles.activeCard,
          {
            // Màu nền và viền động
            backgroundColor: theme.card,
            borderColor:
              booking.status === "checked_in"
                ? theme.success
                : isDarkMode
                ? "#333"
                : theme.warning,
            // Shadow cũng cần chỉnh cho dark mode (thường dark mode ít shadow hoặc shadow màu khác)
            shadowColor: isDarkMode ? "#000" : "#000",
          },
        ]}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <View style={styles.activeCardContent}>
          <View style={{ flex: 1 }}>
            <View style={styles.activeHeaderRow}>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      booking.status === "checked_in"
                        ? isDarkMode
                          ? "#1B3E20"
                          : "#E8F5E9" // Màu xanh đậm hơn cho dark mode
                        : isDarkMode
                        ? "#3E2723"
                        : "#FFF3E0", // Màu cam đậm hơn cho dark mode
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    {
                      color:
                        booking.status === "checked_in"
                          ? theme.success
                          : theme.warning,
                    },
                  ]}
                >
                  {booking.status === "checked_in"
                    ? "ĐANG SỬ DỤNG"
                    : "CHỜ CHECK-IN"}
                </Text>
              </View>
              <Text style={[styles.activeTime, { color: theme.subText }]}>
                {new Date(booking.bookingTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
            <Text style={[styles.activeToiletName, { color: theme.text }]}>
              {booking.toiletName}
            </Text>
            <Text
              style={[styles.activeAddress, { color: theme.subText }]}
              numberOfLines={1}
            >
              📍 {booking.toiletAddress}
            </Text>
          </View>
          <View style={styles.activeArrow}>
            <Ionicons name="chevron-forward" size={24} color={theme.subText} />
          </View>
        </View>

        {/* Footer */}
        <View
          style={[
            styles.activeFooter,
            {
              backgroundColor:
                booking.status === "checked_in"
                  ? isDarkMode
                    ? "#1B3E20"
                    : theme.success // Màu nền footer
                  : isDarkMode
                  ? "#3E2723"
                  : theme.warning,
            },
          ]}
        >
          <Text
            style={[
              styles.activeFooterText,
              { color: isDarkMode ? theme.text : "white" },
            ]}
          >
            {booking.status === "checked_in"
              ? "Thanh toán & Trả phòng"
              : "Lấy mã QR Check-in"}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={16}
            color={isDarkMode ? theme.text : "white"}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: { paddingHorizontal: 20, marginBottom: 10 },
  sectionHeaderTitle: { fontSize: 18, fontWeight: "800", marginBottom: 10 },
  activeCard: {
    borderRadius: 16,
    borderWidth: 1,
    elevation: 4,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: "hidden",
    marginTop: 10,
  },
  activeCardContent: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  activeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  statusBadgeText: { fontSize: 10, fontWeight: "800" },
  activeTime: { fontSize: 12, fontWeight: "500" },
  activeToiletName: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  activeAddress: { fontSize: 13 },
  activeArrow: { justifyContent: "center", paddingLeft: 10 },
  activeFooter: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    gap: 5,
  },
  activeFooterText: { fontWeight: "700", fontSize: 14 },
});
