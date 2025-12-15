// components/ui/UserProfile.tsx - CẬP NHẬT VỚI PROVIDER ROUTING
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { auth, db } from "../../firebaseConfig";
import ProviderAccount from "./ProviderAccount";
import UserAccountComponent from "./UserAccountComponent"; // Component cũ cho user

export default function UserProfile() {
  const [userRole, setUserRole] = useState<"user" | "provider" | null>(null);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  useEffect(() => {
    const initProfile = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          const role = userDoc.data()?.role || "user";
          setUserRole(role);
        } catch (e) {
          console.error("Lỗi check role:", e);
          setUserRole("user");
        } finally {
          setLoading(false);
        }
      }
    };
    initProfile();
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  // 👉 ROUTING: Provider dùng ProviderAccount, User dùng UserAccountComponent
  if (userRole === "provider") {
    return <ProviderAccount />;
  }

  return <UserAccountComponent />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
  },
});
