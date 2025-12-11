import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../../firebaseConfig';

interface InventoryItem {
  id: string;
  toiletId: string;
  toiletName: string;
  itemName: string;
  quantity: number;
  unit: string;
  minThreshold: number;
  lastUpdated: string;
}

interface MaintenanceTask {
  id: string;
  toiletId: string;
  toiletName: string;
  taskType: string;
  description: string;
  scheduledDate: string;
  status: 'pending' | 'completed';
  createdAt: string;
}

export default function InventoryMaintenance() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'maintenance'>('inventory');
  const [toilets, setToilets] = useState<any[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [addInventoryModal, setAddInventoryModal] = useState(false);
  const [addMaintenanceModal, setAddMaintenanceModal] = useState(false);

  // Form states
  const [selectedToiletId, setSelectedToiletId] = useState('');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('cái');
  const [minThreshold, setMinThreshold] = useState('10');
  const [taskType, setTaskType] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    fetchToilets();
  }, []);

  useEffect(() => {
    if (activeTab === 'inventory') {
      fetchInventory();
    } else {
      fetchMaintenanceTasks();
    }
  }, [activeTab]);

  const fetchToilets = async () => {
    try {
      const q = query(
        collection(db, "toilets"),
        where("createdBy", "==", user?.email)
      );
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setToilets(list);
      setLoading(false);
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const q = query(
        collection(db, "inventory"),
        where("createdBy", "==", user?.email)
      );
      const snap = await getDocs(q);
      const list: InventoryItem[] = [];
      snap.forEach(doc => {
        const data = doc.data();
        list.push({
          id: doc.id,
          toiletId: data.toiletId,
          toiletName: data.toiletName,
          itemName: data.itemName,
          quantity: data.quantity,
          unit: data.unit,
          minThreshold: data.minThreshold,
          lastUpdated: data.lastUpdated
        });
      });
      setInventory(list);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchMaintenanceTasks = async () => {
    try {
      const q = query(
        collection(db, "maintenance"),
        where("createdBy", "==", user?.email)
      );
      const snap = await getDocs(q);
      const list: MaintenanceTask[] = [];
      snap.forEach(doc => {
        const data = doc.data();
        list.push({
          id: doc.id,
          toiletId: data.toiletId,
          toiletName: data.toiletName,
          taskType: data.taskType,
          description: data.description,
          scheduledDate: data.scheduledDate,
          status: data.status,
          createdAt: data.createdAt
        });
      });
      setMaintenanceTasks(list.sort((a, b) =>
        new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
      ));
    } catch (error) {
      console.log(error);
    }
  };

  const handleAddInventory = async () => {
    if (!selectedToiletId || !itemName || !quantity) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      const selectedToilet = toilets.find(t => t.id === selectedToiletId);
      await addDoc(collection(db, "inventory"), {
        toiletId: selectedToiletId,
        toiletName: selectedToilet?.name,
        itemName,
        quantity: Number(quantity),
        unit,
        minThreshold: Number(minThreshold),
        lastUpdated: new Date().toISOString(),
        createdBy: user?.email
      });

      Alert.alert('Thành công', 'Đã thêm vật tư mới');
      setAddInventoryModal(false);
      resetInventoryForm();
      fetchInventory();
    } catch (error: any) {
      Alert.alert('Lỗi', error.message);
    }
  };

  const handleAddMaintenance = async () => {
    if (!selectedToiletId || !taskType || !scheduledDate) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      const selectedToilet = toilets.find(t => t.id === selectedToiletId);
      await addDoc(collection(db, "maintenance"), {
        toiletId: selectedToiletId,
        toiletName: selectedToilet?.name,
        taskType,
        description: taskDescription,
        scheduledDate,
        status: 'pending',
        createdAt: new Date().toISOString(),
        createdBy: user?.email
      });

      Alert.alert('Thành công', 'Đã lập lịch bảo trì');
      setAddMaintenanceModal(false);
      resetMaintenanceForm();
      fetchMaintenanceTasks();
    } catch (error: any) {
      Alert.alert('Lỗi', error.message);
    }
  };

  const handleUpdateInventoryQuantity = async (item: InventoryItem, newQty: number) => {
    try {
      const docRef = doc(db, "inventory", item.id);
      await updateDoc(docRef, {
        quantity: newQty,
        lastUpdated: new Date().toISOString()
      });
      fetchInventory();
    } catch (error: any) {
      Alert.alert('Lỗi', error.message);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const docRef = doc(db, "maintenance", taskId);
      await updateDoc(docRef, {
        status: 'completed'
      });
      Alert.alert('Đã hoàn thành', 'Công việc bảo trì đã được đánh dấu hoàn thành');
      fetchMaintenanceTasks();
    } catch (error: any) {
      Alert.alert('Lỗi', error.message);
    }
  };

  const resetInventoryForm = () => {
    setSelectedToiletId('');
    setItemName('');
    setQuantity('');
    setUnit('cái');
    setMinThreshold('10');
  };

  const resetMaintenanceForm = () => {
    setSelectedToiletId('');
    setTaskType('');
    setTaskDescription('');
    setScheduledDate('');
  };

  const renderInventoryItem = ({ item }: { item: InventoryItem }) => {
    const isLowStock = item.quantity <= item.minThreshold;

    return (
      <View style={[styles.card, isLowStock && styles.lowStockCard]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.itemName}</Text>
          <Text style={styles.cardSubtitle}>{item.toiletName}</Text>
          <View style={styles.quantityRow}>
            <Text style={[styles.quantityText, isLowStock && styles.lowStockText]}>
              {item.quantity} {item.unit}
            </Text>
            {isLowStock && (
              <View style={styles.lowStockBadge}>
                <Ionicons name="warning" size={12} color="#FF5722" />
                <Text style={styles.lowStockBadgeText}>Sắp hết</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              Alert.prompt(
                'Cập nhật số lượng',
                `Nhập số lượng mới cho ${item.itemName}`,
                [
                  { text: 'Hủy', style: 'cancel' },
                  {
                    text: 'Lưu',
                    onPress: (value) => {
                      if (value) handleUpdateInventoryQuantity(item, Number(value));
                    }
                  }
                ],
                'plain-text',
                item.quantity.toString(),
                'numeric'
              );
            }}
          >
            <Ionicons name="create-outline" size={20} color="#2196F3" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderMaintenanceItem = ({ item }: { item: MaintenanceTask }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <View style={styles.taskHeader}>
          <Text style={styles.cardTitle}>{item.taskType}</Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: item.status === 'completed' ? '#E8F5E9' : '#FFF3E0' }
          ]}>
            <Text style={[
              styles.statusText,
              { color: item.status === 'completed' ? '#4CAF50' : '#FF9800' }
            ]}>
              {item.status === 'completed' ? 'Hoàn thành' : 'Chờ xử lý'}
            </Text>
          </View>
        </View>
        <Text style={styles.cardSubtitle}>{item.toiletName}</Text>
        {item.description ? (
          <Text style={styles.descriptionText}>{item.description}</Text>
        ) : null}
        <Text style={styles.dateText}>
          <Ionicons name="calendar-outline" size={12} /> {item.scheduledDate}
        </Text>
      </View>
      {item.status === 'pending' && (
        <TouchableOpacity
          style={styles.completeBtn}
          onPress={() => handleCompleteTask(item.id)}
        >
          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
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
        <Text style={styles.headerTitle}>Vận hành & Bảo trì</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'inventory' && styles.activeTab]}
          onPress={() => setActiveTab('inventory')}
        >
          <Text style={[styles.tabText, activeTab === 'inventory' && styles.activeTabText]}>
            Tồn kho
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'maintenance' && styles.activeTab]}
          onPress={() => setActiveTab('maintenance')}
        >
          <Text style={[styles.tabText, activeTab === 'maintenance' && styles.activeTabText]}>
            Lịch bảo trì
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <FlatList
        data={activeTab === 'inventory' ? inventory : maintenanceTasks}
        renderItem={activeTab === 'inventory' ? renderInventoryItem : renderMaintenanceItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {activeTab === 'inventory' ? 'Chưa có vật tư nào' : 'Chưa có lịch bảo trì'}
          </Text>
        }
      />

      {/* Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          if (activeTab === 'inventory') {
            setAddInventoryModal(true);
          } else {
            setAddMaintenanceModal(true);
          }
        }}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>

      {/* Add Inventory Modal */}
      <Modal
        visible={addInventoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setAddInventoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Thêm vật tư</Text>

            <Text style={styles.label}>Địa điểm:</Text>
            <View style={styles.pickerContainer}>
              {toilets.map(toilet => (
                <TouchableOpacity
                  key={toilet.id}
                  style={[
                    styles.pickerItem,
                    selectedToiletId === toilet.id && styles.pickerItemSelected
                  ]}
                  onPress={() => setSelectedToiletId(toilet.id)}
                >
                  <Text style={[
                    styles.pickerItemText,
                    selectedToiletId === toilet.id && styles.pickerItemTextSelected
                  ]}>
                    {toilet.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Tên vật tư:</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: Giấy vệ sinh, Xà phòng..."
              value={itemName}
              onChangeText={setItemName}
            />

            <Text style={styles.label}>Số lượng:</Text>
            <TextInput
              style={styles.input}
              placeholder="Số lượng hiện có"
              keyboardType="numeric"
              value={quantity}
              onChangeText={setQuantity}
            />

            <Text style={styles.label}>Đơn vị:</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: cái, cuộn, chai..."
              value={unit}
              onChangeText={setUnit}
            />

            <Text style={styles.label}>Ngưỡng cảnh báo:</Text>
            <TextInput
              style={styles.input}
              placeholder="Số lượng tối thiểu"
              keyboardType="numeric"
              value={minThreshold}
              onChangeText={setMinThreshold}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setAddInventoryModal(false);
                  resetInventoryForm();
                }}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleAddInventory}
              >
                <Text style={styles.modalConfirmText}>Thêm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Maintenance Modal */}
      <Modal
        visible={addMaintenanceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setAddMaintenanceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Lập lịch bảo trì</Text>

              <Text style={styles.label}>Địa điểm:</Text>
              <View style={styles.pickerContainer}>
                {toilets.map(toilet => (
                  <TouchableOpacity
                    key={toilet.id}
                    style={[
                      styles.pickerItem,
                      selectedToiletId === toilet.id && styles.pickerItemSelected
                    ]}
                    onPress={() => setSelectedToiletId(toilet.id)}
                  >
                    <Text style={[
                      styles.pickerItemText,
                      selectedToiletId === toilet.id && styles.pickerItemTextSelected
                    ]}>
                      {toilet.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Loại công việc:</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: Vệ sinh tổng thể, Sửa chữa..."
                value={taskType}
                onChangeText={setTaskType}
              />

              <Text style={styles.label}>Mô tả chi tiết:</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Mô tả công việc cần làm..."
                multiline
                numberOfLines={3}
                value={taskDescription}
                onChangeText={setTaskDescription}
              />

              <Text style={styles.label}>Ngày thực hiện:</Text>
              <TextInput
                style={styles.input}
                placeholder="DD/MM/YYYY"
                value={scheduledDate}
                onChangeText={setScheduledDate}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => {
                    setAddMaintenanceModal(false);
                    resetMaintenanceForm();
                  }}
                >
                  <Text style={styles.modalCancelText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmBtn}
                  onPress={handleAddMaintenance}
                >
                  <Text style={styles.modalConfirmText}>Tạo</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
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
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 15 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#2196F3' },
  tabText: { fontWeight: '500', color: '#666' },
  activeTabText: { color: '#2196F3', fontWeight: 'bold' },
  listContainer: { padding: 20 },
  card: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2
  },
  lowStockCard: { borderLeftWidth: 4, borderLeftColor: '#FF5722' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  cardSubtitle: { fontSize: 12, color: '#666', marginBottom: 5 },
  quantityRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  quantityText: { fontSize: 18, fontWeight: 'bold', color: '#4CAF50' },
  lowStockText: { color: '#FF5722' },
  lowStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10
  },
  lowStockBadgeText: { fontSize: 10, color: '#FF5722', marginLeft: 3, fontWeight: 'bold' },
  actionButtons: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center'
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  descriptionText: { fontSize: 13, color: '#666', marginVertical: 5 },
  dateText: { fontSize: 12, color: '#999', marginTop: 5 },
  completeBtn: { padding: 10 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 30 },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    maxHeight: '90%'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20
  },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 8, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 10
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  pickerContainer: { marginBottom: 10 },
  pickerItem: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8
  },
  pickerItemSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
    borderWidth: 2
  },
  pickerItemText: { color: '#666' },
  pickerItemTextSelected: { color: '#2196F3', fontWeight: 'bold' },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20
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