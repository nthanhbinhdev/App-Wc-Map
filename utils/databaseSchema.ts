// utils/databaseSchema.ts
// Định nghĩa cấu trúc dữ liệu cho hệ thống booking

export interface Room {
  id: string;
  toiletId: string; // ID của WC/bathhouse
  roomNumber: string; // "101", "102", etc.
  type: 'single' | 'couple' | 'family'; // Loại phòng
  status: 'available' | 'booked' | 'occupied' | 'maintenance';
  price: number; // Giá phòng (có thể khác giá WC chung)
  amenities: string[]; // Tiện nghi riêng của phòng
  createdAt: string;
  lastUpdated: string;
}

export interface Booking {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhone: string;
  
  toiletId: string;
  toiletName: string;
  toiletAddress: string;
  
  roomId: string;
  roomNumber: string;
  
  // Thông tin thời gian
  bookingTime: string; // Thời điểm đặt
  estimatedArrival: string; // ETA - Khách dự kiến đến lúc nào
  expiryTime: string; // Hết hạn giữ chỗ (booking + 15 phút)
  
  // Trạng thái booking
  status: 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'expired';
  
  // Check-in/out
  checkInTime?: string;
  checkOutTime?: string;
  
  // Thanh toán
  totalPrice: number;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  paymentMethod?: string;
  
  // Ghi chú & liên hệ
  notes?: string;
  providerNotes?: string; // Ghi chú của chủ WC
  
  // QR Code
  qrCode: string; // Mã QR unique cho booking này
  
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  recipientId: string; // userId của người nhận
  recipientRole: 'user' | 'provider';
  
  type: 'booking_created' | 'booking_reminder' | 'booking_expired' | 'check_in' | 'check_out' | 'booking_cancelled';
  
  title: string;
  message: string;
  
  // Liên kết
  bookingId?: string;
  toiletId?: string;
  
  isRead: boolean;
  createdAt: string;
}

export interface RoomHistory {
  id: string;
  roomId: string;
  toiletId: string;
  bookingId: string;
  
  userId: string;
  userEmail: string;
  
  checkInTime: string;
  checkOutTime: string;
  duration: number; // Phút
  
  price: number;
  rating?: number;
  
  createdAt: string;
}

// Hàm helper để tạo dữ liệu mẫu
export const createSampleRooms = async (toiletId: string, toiletName: string) => {
  const roomTypes = [
    { type: 'single', count: 5, price: 30000 },
    { type: 'couple', count: 3, price: 50000 },
    { type: 'family', count: 2, price: 80000 }
  ];
  
  const rooms: Room[] = [];
  let roomCounter = 101;
  
  for (const roomType of roomTypes) {
    for (let i = 0; i < roomType.count; i++) {
      rooms.push({
        id: `${toiletId}_room_${roomCounter}`,
        toiletId,
        roomNumber: String(roomCounter),
        type: roomType.type as any,
        status: 'available',
        price: roomType.price,
        amenities: ['hot_water', 'towel', 'soap'],
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });
      roomCounter++;
    }
  }
  
  return rooms;
};

// Constants
export const BOOKING_HOLD_TIME = 15 * 60 * 1000; // 15 phút tính bằng milliseconds
export const BOOKING_REMINDER_TIME = 5 * 60 * 1000; // Nhắc nhở trước 5 phút

export const ROOM_STATUS_LABELS = {
  available: 'Trống',
  booked: 'Đã đặt',
  occupied: 'Đang sử dụng',
  maintenance: 'Bảo trì'
};

export const BOOKING_STATUS_LABELS = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  checked_in: 'Đang sử dụng',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  expired: 'Hết hạn'
};