// components/ui/AdminPendingToilets.tsx
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  doc,
  DocumentData,
  getDoc,
  limit,
  onSnapshot,
  query,
  QuerySnapshot,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { auth, db } from "../../firebaseConfig";

type Toilet = {
  id: string;
  name?: string;
  address?: string;
  status?: string;
  createdAt?: Date | null;
  rawCreatedAt?: any;
  price?: number;
  rating?: number;
  ratingCount?: number;
  amenities?: string[];
  createdBy?: string;
  location?: any;
  [key: string]: any;
};

function parseCreatedAt(value: any): Date | null {
  if (!value) return null;
  if (typeof value === "object" && typeof value.toDate === "function") {
    try {
      return value.toDate();
    } catch {
      return null;
    }
  }
  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export default function AdminPendingToilets() {
  const [items, setItems] = useState<Toilet[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchAndSubscribe = useCallback(
    async (user: User, unsubRef: { current?: (() => void) | null }) => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const role = userDoc.exists()
          ? (userDoc.data().role as string | undefined)
          : undefined;

        if (role !== "admin") {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        setIsAdmin(true);

        const q = query(
          collection(db, "toilets"),
          where("status", "==", "pending"),
          limit(200)
        );

        unsubRef.current = onSnapshot(
          q,
          (snapshot: QuerySnapshot<DocumentData>) => {
            const arr: Toilet[] = snapshot.docs.map((d) => {
              const data = d.data();
              const parsed = parseCreatedAt(
                data.createdAt ?? data.createdAtString ?? data.createdAtMillis
              );
              return {
                id: d.id,
                ...data,
                rawCreatedAt: data.createdAt,
                createdAt: parsed,
              } as Toilet;
            });

            arr.sort((a, b) => {
              const ta = a.createdAt ? a.createdAt.getTime() : 0;
              const tb = b.createdAt ? b.createdAt.getTime() : 0;
              return tb - ta;
            });

            setItems(arr);
            setLoading(false);
            setRefreshing(false);
          },
          (err: any) => {
            console.error("Snapshot error", err);
            setLoading(false);
            setRefreshing(false);
            const msg: string = err?.message ?? "";
            const urlMatch = msg.match(/https?:\/\/[^\s)]+/);
            const url = urlMatch ? urlMatch[0] : null;
            if (url) {
              Alert.alert(
                "Lỗi truy vấn",
                "Truy vấn yêu cầu tạo index trên Firestore. Mở trang tạo index?",
                [
                  { text: "Đóng", style: "cancel" },
                  {
                    text: "Mở",
                    onPress: () =>
                      Linking.openURL(url).catch(() =>
                        Alert.alert("Lỗi", "Không thể mở link.")
                      ),
                  },
                ]
              );
            } else {
              Alert.alert(
                "Lỗi",
                "Không thể tải danh sách pending. Kiểm tra console để biết chi tiết."
              );
            }
          }
        );
      } catch (err) {
        console.error("subscribeForPending error", err);
        setIsAdmin(false);
        setLoading(false);
        setRefreshing(false);
        Alert.alert("Lỗi", "Không thể kiểm tra quyền hoặc tải dữ liệu.");
      }
    },
    []
  );

  useEffect(() => {
    let unsubSnapshotRef: { current?: (() => void) | null } = { current: null };
    let unsubAuth: (() => void) | null = null;

    unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubSnapshotRef.current) {
        unsubSnapshotRef.current();
        unsubSnapshotRef.current = null;
      }
      setItems([]);
      setIsAdmin(false);
      setLoading(true);

      if (user) {
        fetchAndSubscribe(user, unsubSnapshotRef);
      } else {
        setLoading(false);
      }
    });

    return () => {
      if (unsubSnapshotRef.current) unsubSnapshotRef.current();
      if (unsubAuth) unsubAuth();
    };
  }, [fetchAndSubscribe]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Force re-subscribe by toggling auth state handler: easiest is to re-run fetch via current user
    const user = auth.currentUser;
    if (user) {
      // quick re-fetch: unsubscribe then subscribe again
      setItems([]);
      setLoading(true);
      fetchAndSubscribe(user, { current: null });
    } else {
      setRefreshing(false);
    }
  }, [fetchAndSubscribe]);

  async function updateStatus(id: string, newStatus: string) {
    setProcessingId(id);
    try {
      const toiletRef = doc(db, "toilets", id);
      await updateDoc(toiletRef, {
        status: newStatus,
        reviewedAt: serverTimestamp(),
      });
      setProcessingId(null);
      // optional: remove from list immediately for snappier UI
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch (err) {
      console.error("Update status error", err);
      setProcessingId(null);
      Alert.alert("Lỗi", "Cập nhật trạng thái thất bại.");
    }
  }

  function renderAmenities(amenities?: string[]) {
    if (!amenities || amenities.length === 0)
      return (
        <Text style={styles.amenityText}>Không có thông tin tiện nghi</Text>
      );
    return (
      <View style={styles.amenitiesRow}>
        {amenities.map((a) => (
          <View key={a} style={styles.amenityBadge}>
            <Text style={styles.amenityText}>{a.replace("_", " ")}</Text>
          </View>
        ))}
      </View>
    );
  }

  function renderItem({ item }: { item: Toilet }) {
    const busy = processingId === item.id;
    const expanded = expandedId === item.id;
    return (
      <Pressable
        onPress={() =>
          setExpandedId((prev) => (prev === item.id ? null : item.id))
        }
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <View style={styles.cardLeft}>
          <View style={styles.avatar}>
            <Ionicons name="water" size={20} color="#fff" />
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.row}>
            <Text style={styles.title}>{item.name ?? "Không tên"}</Text>
            <View style={styles.metaRight}>
              {typeof item.rating === "number" && (
                <View style={styles.rating}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={styles.ratingText}>{item.rating}</Text>
                </View>
              )}
              {typeof item.price === "number" && (
                <Text style={styles.priceText}>
                  {item.price.toLocaleString()}₫
                </Text>
              )}
            </View>
          </View>

          <Text style={styles.sub}>{item.address ?? "Không có địa chỉ"}</Text>
          <Text style={styles.idText}>ID: {item.id}</Text>
          <Text style={styles.dateText}>
            {item.createdAt
              ? `Tạo: ${item.createdAt.toLocaleString()}`
              : "Ngày tạo: không xác định"}
          </Text>

          {expanded && (
            <View style={styles.expanded}>
              {renderAmenities(item.amenities)}
              <Text style={styles.detailText}>
                Người tạo: {item.createdBy ?? "Không rõ"}
              </Text>
              {item.location && (
                <Text style={styles.detailText}>
                  Vị trí:{" "}
                  {Array.isArray(item.location)
                    ? item.location.join(", ")
                    : JSON.stringify(item.location)}
                </Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.cardRight}>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              styles.approve,
              pressed && styles.actionPressed,
            ]}
            onPress={() =>
              Alert.alert("Xác nhận", "Duyệt nhà vệ sinh này?", [
                { text: "Hủy", style: "cancel" },
                {
                  text: "Duyệt",
                  onPress: () => updateStatus(item.id, "approved"),
                },
              ])
            }
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="checkmark" size={20} color="#fff" />
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              styles.reject,
              pressed && styles.actionPressed,
            ]}
            onPress={() =>
              Alert.alert("Xác nhận", "Từ chối nhà vệ sinh này?", [
                { text: "Hủy", style: "cancel" },
                {
                  text: "Từ chối",
                  onPress: () => updateStatus(item.id, "rejected"),
                },
              ])
            }
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <MaterialIcons name="close" size={20} color="#fff" />
            )}
          </Pressable>
        </View>
      </Pressable>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Text style={styles.notAllowed}>
          Bạn không có quyền admin để xem trang này
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Danh sách nhà tắm đang chờ duyệt</Text>
        <Pressable style={styles.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={20} color="#2196F3" />
        </Pressable>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons
            name="checkmark-done-circle-outline"
            size={48}
            color="#999"
          />
          <Text style={styles.emptyText}>Không có nhà vệ sinh pending</Text>
          <Text style={styles.emptySub}>Kéo xuống để làm mới</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: "#f2f4f8" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  header: { fontSize: 18, fontWeight: "700", color: "#111", marginTop: 40, },
  refreshBtn: { padding: 6, marginTop: 40, },
  list: { paddingBottom: 24 },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardPressed: { opacity: 0.95 },
  cardLeft: { marginRight: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#2196F3",
    justifyContent: "center",
    alignItems: "center",
  },
  cardBody: { flex: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 16, fontWeight: "700", color: "#0b2545" },
  metaRight: { flexDirection: "row", alignItems: "center" },
  rating: { flexDirection: "row", alignItems: "center", marginRight: 8 },
  ratingText: { marginLeft: 4, color: "#333", fontWeight: "600" },
  priceText: { color: "#2e7d32", fontWeight: "700" },
  sub: { fontSize: 13, color: "#556", marginTop: 4 },
  idText: { fontSize: 11, color: "#888", marginTop: 6 },
  dateText: { fontSize: 12, color: "#666", marginTop: 4 },
  cardRight: {
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionPressed: { opacity: 0.85 },
  approve: { backgroundColor: "#2e7d32" },
  reject: { backgroundColor: "#c62828" },
  expanded: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 8,
  },
  amenitiesRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },
  amenityBadge: {
    backgroundColor: "#eef6ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 6,
  },
  amenityText: { color: "#0b5ed7", fontSize: 12 },
  detailText: { color: "#444", fontSize: 13, marginTop: 6 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 8, color: "#444" },
  notAllowed: { color: "#b00020", fontSize: 16 },
  emptyBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
  emptyText: { marginTop: 12, fontSize: 16, color: "#666", fontWeight: "600" },
  emptySub: { marginTop: 6, fontSize: 13, color: "#999" },
});
