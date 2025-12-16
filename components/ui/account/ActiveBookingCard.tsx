import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ActiveBookingCardProps {
  booking: any;
  onPress: () => void;
}

export default function ActiveBookingCard({ booking, onPress }: ActiveBookingCardProps) {
  if (!booking) return null;

  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionHeaderTitle}>Hoạt động hiện tại</Text>
      <TouchableOpacity
        style={[
          styles.activeCard,
          {
            borderColor:
              booking.status === "checked_in" ? "#4CAF50" : "#FF9800",
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
                        ? "#E8F5E9"
                        : "#FFF3E0",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    {
                      color:
                        booking.status === "checked_in"
                          ? "#2E7D32"
                          : "#EF6C00",
                    },
                  ]}
                >
                  {booking.status === "checked_in"
                    ? "ĐANG SỬ DỤNG"
                    : "CHỜ CHECK-IN"}
                </Text>
              </View>
              <Text style={styles.activeTime}>
                {new Date(booking.bookingTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
            <Text style={styles.activeToiletName}>{booking.toiletName}</Text>
            <Text style={styles.activeAddress} numberOfLines={1}>
              📍 {booking.toiletAddress}
            </Text>
          </View>
          <View style={styles.activeArrow}>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </View>
        </View>
        <View
          style={[
            styles.activeFooter,
            {
              backgroundColor:
                booking.status === "checked_in" ? "#4CAF50" : "#FF9800",
            },
          ]}
        >
          <Text style={styles.activeFooterText}>
            {booking.status === "checked_in"
              ? "Thanh toán & Trả phòng"
              : "Lấy mã QR Check-in"}
          </Text>
          <Ionicons name="arrow-forward" size={16} color="white" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: { paddingHorizontal: 20, marginBottom: 10 },
  sectionHeaderTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A1A" },
  activeCard: {
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    elevation: 4,
    shadowColor: "#000",
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
  activeTime: { fontSize: 12, color: "#999", fontWeight: "500" },
  activeToiletName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#333",
    marginBottom: 4,
  },
  activeAddress: { fontSize: 13, color: "#666" },
  activeArrow: { justifyContent: "center", paddingLeft: 10 },
  activeFooter: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    gap: 5,
  },
  activeFooterText: { color: "white", fontWeight: "700", fontSize: 14 },
});