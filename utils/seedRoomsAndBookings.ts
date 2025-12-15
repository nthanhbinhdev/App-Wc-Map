// utils/seedRoomsAndBookings.ts
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const seedRoomsForAllToilets = async () => {
  try {
    console.log('🚀 Bắt đầu tạo phòng cho tất cả WC...');

    // Lấy tất cả WC
    const qToilets = query(collection(db, 'toilets'));
    const snapToilets = await getDocs(qToilets);

    let totalRoomsCreated = 0;

    for (const toiletDoc of snapToilets.docs) {
      const toilet = { id: toiletDoc.id, ...toiletDoc.data() };

      // Kiểm tra xem WC này đã có phòng chưa
      const qExistingRooms = query(
        collection(db, 'rooms'),
        where('toiletId', '==', toilet.id)
      );
      const existingRooms = await getDocs(qExistingRooms);

      if (existingRooms.size > 0) {
        console.log(`⏭️  ${toilet.name} đã có ${existingRooms.size} phòng, bỏ qua`);
        continue;
      }

      // Tạo phòng cho WC này
      const roomTypes = [
        { type: 'single', count: 5, price: 30000 },
        { type: 'couple', count: 3, price: 50000 },
        { type: 'family', count: 2, price: 80000 }
      ];

      let roomCounter = 101;

      for (const roomType of roomTypes) {
        for (let i = 0; i < roomType.count; i++) {
          const roomData = {
            toiletId: toilet.id,
            toiletName: toilet.name,
            roomNumber: String(roomCounter),
            type: roomType.type,
            status: 'available',
            price: roomType.price,
            amenities: ['hot_water', 'towel', 'soap'],
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          };

          await addDoc(collection(db, 'rooms'), roomData);
          totalRoomsCreated++;
          roomCounter++;
        }
      }

      console.log(`✅ Đã tạo 10 phòng cho ${toilet.name}`);
    }

    console.log(`🎉 Hoàn tất! Tổng cộng tạo ${totalRoomsCreated} phòng.`);
    return { success: true, totalRoomsCreated };

  } catch (error) {
    console.error('❌ Lỗi:', error);
    throw error;
  }
};

// Tạo bookings giả để test
export const createSampleBookings = async (userId: string, userEmail: string) => {
  try {
    console.log('🚀 Tạo bookings mẫu...');

    // Lấy danh sách phòng available
    const qRooms = query(
      collection(db, 'rooms'),
      where('status', '==', 'available')
    );
    const snapRooms = await getDocs(qRooms);

    if (snapRooms.size === 0) {
      throw new Error('Không có phòng nào available');
    }

    // Tạo 3 bookings mẫu
    const sampleBookings = [
      {
        userName: 'Nguyễn Văn A',
        userPhone: '0901234567',
        estimatedMinutes: 10,
        status: 'pending'
      },
      {
        userName: 'Trần Thị B',
        userPhone: '0912345678',
        estimatedMinutes: 15,
        status: 'confirmed'
      },
      {
        userName: 'Lê Văn C',
        userPhone: '0923456789',
        estimatedMinutes: 5,
        status: 'checked_in'
      }
    ];

    let bookingCount = 0;
    const roomDocs = snapRooms.docs;

    for (let i = 0; i < Math.min(3, roomDocs.length); i++) {
      const room = { id: roomDocs[i].id, ...roomDocs[i].data() };
      const sample = sampleBookings[i];

      const now = new Date();
      const eta = new Date(now.getTime() + sample.estimatedMinutes * 60000);
      const expiry = new Date(now.getTime() + 15 * 60000);

      const bookingData = {
        userId,
        userEmail,
        userName: sample.userName,
        userPhone: sample.userPhone,

        toiletId: room.toiletId,
        toiletName: room.toiletName,
        toiletAddress: 'Địa chỉ mẫu',

        roomId: room.id,
        roomNumber: room.roomNumber,

        bookingTime: now.toISOString(),
        estimatedArrival: eta.toISOString(),
        expiryTime: expiry.toISOString(),

        status: sample.status,

        totalPrice: room.price,
        paymentStatus: 'pending',

        notes: 'Booking mẫu để test',
        qrCode: `BOOKING_${userId}_${Date.now()}_${room.id}`,

        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };

      await addDoc(collection(db, 'bookings'), bookingData);
      bookingCount++;
    }

    console.log(`✅ Đã tạo ${bookingCount} bookings mẫu`);
    return { success: true, bookingCount };

  } catch (error) {
    console.error('❌ Lỗi:', error);
    throw error;
  }
};

// Export tất cả functions
export const seedAllData = async (userId: string, userEmail: string) => {
  const results = {
    rooms: 0,
    bookings: 0
  };

  // 1. Tạo phòng
  const roomResult = await seedRoomsForAllToilets();
  results.rooms = roomResult.totalRoomsCreated;

  // 2. Tạo bookings
  const bookingResult = await createSampleBookings(userId, userEmail);
  results.bookings = bookingResult.bookingCount;

  return results;
};