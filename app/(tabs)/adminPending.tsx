// app/(tabs)/adminPending.tsx
import React from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import AdminPendingToilets from "../../components/ui/AdminPendingToilets";

export default function AdminPendingScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <AdminPendingToilets />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
});
