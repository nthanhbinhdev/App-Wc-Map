import { Ionicons } from '@expo/vector-icons';
import { collection, doc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../../firebaseConfig';

interface Incident {
  id: string;
  toiletId: string;
  toiletName: string;
  issue: string;
  reportedBy: string;
  status: 'pending' | 'processing' | 'resolved';
  createdAt: string;
  response?: string;
  resolvedAt?: string;
}

interface Review {
  id: string;
  toiletId: string;
  userName: string;
  userEmail: string;
  rating: number;
  comment: string;
  createdAt: string;
  response?: string;
}

export default function IncidentManagement() {
  const [activeTab, setActiveTab] = useState<'incidents' | 'reviews'>('incidents');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [responseModal, setResponseModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [responseText, setResponseText] = useState('');

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    if (activeTab === 'incidents') {
      fetchIncidents();
    } else {
      fetchReviews();
    }
  }, [activeTab]);

  const fetchIncidents = () => {
    setLoading(true);
    const q = query(
      collection(db, "incidents"),
      where("providerEmail", "==", user?.email)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Incident[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        list.push({
          id: doc.id,
          toiletId: data.toiletId,
          toiletName: data.toiletName,
          issue: data.issue,
          reportedBy: data.reportedBy,
          status: data.status,
          createdAt: data.createdAt,
          response: data.response,
          resolvedAt: data.resolvedAt
        });
      });

      setIncidents(list.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
      setLoading(false);
    });

    return () => unsubscribe();
  };

  const fetchReviews = async () => {
    try {
      setLoading(true);

      // Lấy danh sách WC của provider
      const qToilets = query(
        collection(db, "toilets"),
        where("createdBy", "==", user?.email)
      );
      const snapToilets = await getDocs(qToilets);
      const toiletIds: string[] = [];
      snapToilets.forEach(doc => toiletIds.push(doc.id));

      if (toiletIds.length === 0) {
        setReviews([]);
        setLoading(false);
        return;
      }

      // Lấy tất cả reviews của các WC đó
      const qReviews = query(
        collection(db, "reviews"),
        where("toiletId", "in", toiletIds)
      );
      const snapReviews = await getDocs(qReviews);
      const list: Review[] = [];

      snapReviews.forEach(doc => {
        const data = doc.data();
        list.push({
          id: doc.id,
          toiletId: data.toiletId,
          userName: data.userName,
          userEmail: data.userEmail,
          rating: data.rating,
          comment: data.comment,
          createdAt: data.createdAt,
          response: data.response
        });
      });

      setReviews(list.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
      setLoading(false);
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  const handleUpdateIncidentStatus = async (incidentId: string, newStatus: string) => {
    try {
      const docRef = doc(db, "incidents", incidentId);
      const updateData: any = { status: newStatus };

      if (newStatus === 'resolved') {
        updateData.resolvedAt = new Date().toISOString();
      }

      await updateDoc(docRef, updateData);
      Alert.alert('Thành công', 'Đã cập nhật trạng thái');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message);
    }
  };

  const handleRespondToIncident = async () => {
    if (!responseText.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập nội dung phản hồi');
      return;
    }

    try {
      const docRef = doc(db, "incidents", selectedItem.id);
      await updateDoc(docRef, {
        response: responseText,
        status: 'resolved',
        resolvedAt: new Date().toISOString()
      });

      Alert.alert('Thành công', 'Đã gửi phản hồi');
      setResponseModal(false);
      setResponseText('');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message);
    }
  };

  const handleRespondToReview = async () => {
    if (!responseText.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập nội dung phản hồi');
      return;
    }

    try {
      const docRef = doc(db, "reviews", selectedItem.id);
      await updateDoc(docRef, {
        response: responseText
      });

      Alert.alert('Thành công', 'Đã gửi phản hồi');
      setResponseModal(false);
      setResponseText('');
      fetchReviews();
    } catch (error: any) {
      Alert.alert('Lỗi', error.message);
    }
  };

  const renderIncidentItem = ({ item }: { item: Incident }) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'pending': return '#FFA726';
        case 'processing': return '#42A5F5';
        case 'resolved': return '#66BB6A';
        default: return '#999';
      }
    };

    const getStatusText = (status: string) => {
      switch (status) {
        case 'pending': return 'Chờ xử lý';
        case 'processing': return 'Đang xử lý';
        case 'resolved': return 'Đã giải quyết';
        default: return status;
      }
    };

    return (
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <View style={styles.cardHeader}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
            <Text style={styles.issueType}>{item.issue}</Text>
          </View>

          <Text style={styles.toiletName}>{item.toiletName}</Text>
          <Text style={styles.reporterText}>
            Báo cáo bởi: {item.reportedBy}
          </Text>
          <Text style={styles.dateText}>
            {new Date(item.createdAt).toLocaleString('vi-VN')}
          </Text>

          {item.response && (
            <View style={styles.responseBox}>
              <Text style={styles.responseLabel}>Đã phản hồi:</Text>
              <Text style={styles.responseText}>{item.response}</Text>
            </View>
          )}
        </View>

        <View style={styles.actionColumn}>
          {item.status === 'pending' && (
            <>
              <TouchableOpacity
                style={[styles.statusBtn, { backgroundColor: '#42A5F5' }]}
                onPress={() => handleUpdateIncidentStatus(item.id, 'processing')}
              >
                <Ionicons name="time-outline" size={16} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.respondBtn}
                onPress={() => {
                  setSelectedItem(item);
                  setResponseModal(true);
                }}
              >
                <Ionicons name="chatbubble-outline" size={16} color="white" />
              </TouchableOpacity>
            </>
          )}

          {item.status === 'processing' && (
            <TouchableOpacity
              style={[styles.statusBtn, { backgroundColor: '#66BB6A' }]}
              onPress={() => handleUpdateIncidentStatus(item.id, 'resolved')}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderReviewItem = ({ item }: { item: Review }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <View style={styles.reviewHeader}>
          <Text style={styles.userName}>{item.userName}</Text>
          <View style={styles.ratingRow}>
            {[...Array(5)].map((_, i) => (
              <Ionicons
                key={i}
                name={i < item.rating ? "star" : "star-outline"}
                size={14}
                color="#FBC02D"
              />
            ))}
          </View>
        </View>

        {item.comment && (
          <Text style={styles.commentText}>"{item.comment}"</Text>
        )}

        <Text style={styles.dateText}>
          {new Date(item.createdAt).toLocaleString('vi-VN')}
        </Text>

        {item.response && (
          <View style={styles.responseBox}>
            <Text style={styles.responseLabel}>Bạn đã trả lời:</Text>
            <Text style={styles.responseText}>{item.response}</Text>
          </View>
        )}
      </View>

      {!item.response && (
        <TouchableOpacity
          style={styles.respondBtn}
          onPress={() => {
            setSelectedItem(item);
            setResponseModal(true);
          }}
        >
          <Ionicons name="chatbubble-outline" size={16} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Phản hồi khách hàng</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {incidents.filter(i => i.status === 'pending').length}
            </Text>
            <Text style={styles.statLabel}>Sự cố chờ</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {reviews.filter(r => !r.response).length}
            </Text>
            <Text style={styles.statLabel}>Đánh giá chưa trả lời</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'incidents' && styles.activeTab]}
          onPress={() => setActiveTab('incidents')}
        >
          <Ionicons
            name="warning-outline"
            size={20}
            color={activeTab === 'incidents' ? '#2196F3' : '#666'}
          />
          <Text style={[styles.tabText, activeTab === 'incidents' && styles.activeTabText]}>
            Sự cố ({incidents.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'reviews' && styles.activeTab]}
          onPress={() => setActiveTab('reviews')}
        >
          <Ionicons
            name="star-outline"
            size={20}
            color={activeTab === 'reviews' ? '#2196F3' : '#666'}
          />
          <Text style={[styles.tabText, activeTab === 'reviews' && styles.activeTabText]}>
            Đánh giá ({reviews.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <FlatList
        data={activeTab === 'incidents' ? incidents : reviews}
        renderItem={activeTab === 'incidents' ? renderIncidentItem : renderReviewItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {activeTab === 'incidents' ? 'Không có sự cố nào' : 'Chưa có đánh giá'}
          </Text>
        }
      />

      {/* Response Modal */}
      <Modal
        visible={responseModal}
        transparent
        animationType="slide"
        onRequestClose={() => setResponseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Phản hồi</Text>

            <TextInput
              style={styles.textArea}
              placeholder="Nhập nội dung phản hồi..."
              multiline
              numberOfLines={5}
              value={responseText}
              onChangeText={setResponseText}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setResponseModal(false);
                  setResponseText('');
                }}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={activeTab === 'incidents' ? handleRespondToIncident : handleRespondToReview}
              >
                <Text style={styles.modalConfirmText}>Gửi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#2196F3',
    padding: 20,
    paddingTop: 60,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white', marginBottom: 15 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: {
    flex: 1,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center'
  },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#FF5722' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 5 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8
  },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#2196F3' },
  tabText: { fontWeight: '500', color: '#666' },
  activeTabText: { color: '#2196F3', fontWeight: 'bold' },
  listContainer: { padding: 20 },
  card: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    elevation: 2
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  issueType: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  toiletName: { fontSize: 14, color: '#666', marginBottom: 4 },
  reporterText: { fontSize: 12, color: '#999', marginBottom: 4 },
  dateText: { fontSize: 11, color: '#999' },
  responseBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3'
  },
  responseLabel: { fontSize: 11, color: '#666', fontWeight: 'bold', marginBottom: 3 },
  responseText: { fontSize: 12, color: '#333' },
  actionColumn: { gap: 8, marginLeft: 10 },
  statusBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  respondBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center'
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  userName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  ratingRow: { flexDirection: 'row', gap: 2 },
  commentText: {
    fontSize: 13,
    color: '#555',
    fontStyle: 'italic',
    marginBottom: 8,
    lineHeight: 18
  },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 30 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 30
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    elevation: 10
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 15
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10
  },
  modalCancelBtn: { paddingHorizontal: 20, paddingVertical: 10 },
  modalCancelText: { color: '#666', fontWeight: 'bold' },
  modalConfirmBtn: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  modalConfirmText: { color: 'white', fontWeight: 'bold' }
});