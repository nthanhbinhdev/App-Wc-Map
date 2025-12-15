import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Tâm điểm các quận để random xung quanh (Quận 1, 3, 5, BT, PN...)
const DISTRICTS = [
  { name: 'Quận 1', lat: 10.7756, lng: 106.7004 },
  { name: 'Quận 3', lat: 10.7843, lng: 106.6844 },
  { name: 'Quận 4', lat: 10.7578, lng: 106.7013 },
  { name: 'Quận 5', lat: 10.7540, lng: 106.6633 },
  { name: 'Quận 10', lat: 10.7716, lng: 106.6676 },
  { name: 'Bình Thạnh', lat: 10.8105, lng: 106.7091 },
  { name: 'Phú Nhuận', lat: 10.7991, lng: 106.6802 },
  { name: 'Tân Bình', lat: 10.8014, lng: 106.6523 },
];

const BATH_NAMES = [
  "Nhà tắm công cộng", "Bath Station", "Trạm tắm rửa", "Shower & Go", "City Bathhouse",
  "Sauna & Spa", "Refresh Hub", "Clean & Fresh", "Eco Bath", "Urban Shower"
];

// Danh sách ID tiện ích
const AMENITIES_POOL = [
  'hot_water', 'towel', 'soap', 'hair_dryer', 
  'locker', 'parking', 'wifi', 'wc',
  'sauna', 'massage', 'laundry', 'shop', 'charge', 'accessible'
];

const IMAGES = [
  'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600',
  'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=600',
  'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600',
  'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600',
  'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=600',
  'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=600'
];

// Hàm này sẽ tạo cả Quán lẫn Phòng
export const seedDatabase = async (providerEmail: string = 'admin_seed@wcmap.vn') => {
  const promises = [];

  for (let i = 0; i < 10; i++) {
    // Gọi hàm tạo từng quán một để dễ quản lý
    promises.push(createToiletWithRooms(providerEmail, i));
  }

  await Promise.all(promises);
};

// Hàm helper để tạo 1 quán + 5 phòng
const createToiletWithRooms = async (email: string, index: number) => {
    // 1. Random thông tin quán
    const district = DISTRICTS[Math.floor(Math.random() * DISTRICTS.length)];
    const lat = district.lat + (Math.random() * 0.03 - 0.015);
    const lng = district.lng + (Math.random() * 0.03 - 0.015);
    const randomAmenities = AMENITIES_POOL.filter(() => Math.random() > 0.6);
    if (!randomAmenities.includes('hot_water')) randomAmenities.push('hot_water');

    const toiletData = {
      name: `${BATH_NAMES[Math.floor(Math.random() * BATH_NAMES.length)]} ${district.name} #${index + 1}`,
      address: `Đường số ${Math.floor(Math.random() * 20) + 1}, ${district.name}, TP.HCM`,
      price: Math.floor(Math.random() * 10) * 5000 + 10000, 
      amenities: randomAmenities,
      createdBy: email,
      status: 'approved',
      rating: Number((3 + Math.random() * 2).toFixed(1)),
      ratingCount: Math.floor(Math.random() * 200) + 1,
      latitude: lat,
      longitude: lng,
      type: 'bathhouse',
      createdAt: new Date().toISOString(),
      image: IMAGES[Math.floor(Math.random() * IMAGES.length)]
    };

    // 2. Lưu quán vào DB và lấy ID
    const toiletRef = await addDoc(collection(db, "toilets"), toiletData);

    // 3. Tạo 5 phòng cho quán này (3 đơn, 2 đôi)
    const roomsData = [
        { type: 'single', num: '101', price: toiletData.price },
        { type: 'single', num: '102', price: toiletData.price },
        { type: 'single', num: '103', price: toiletData.price },
        { type: 'couple', num: '201', price: toiletData.price * 1.5 },
        { type: 'couple', num: '202', price: toiletData.price * 1.5 },
    ];

    const roomPromises = roomsData.map(r => 
        addDoc(collection(db, 'rooms'), {
            toiletId: toiletRef.id,
            toiletName: toiletData.name,
            roomNumber: r.num,
            type: r.type,
            status: 'available', // Phòng trống, sẵn sàng đặt
            price: r.price,
            amenities: ['hot_water', 'towel', 'soap'],
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        })
    );

    // Chờ tạo xong hết phòng
    await Promise.all(roomPromises);
};