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

// Danh sách ID tiện ích (khớp với AddFacility và UserMap)
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

export const seedDatabase = async () => {
  const promises = [];

  for (let i = 0; i < 50; i++) {
    // 1. Chọn random quận
    const district = DISTRICTS[Math.floor(Math.random() * DISTRICTS.length)];
    
    // 2. Random tọa độ lệch một chút xung quanh tâm quận (khoảng 1-2km)
    const lat = district.lat + (Math.random() * 0.03 - 0.015);
    const lng = district.lng + (Math.random() * 0.03 - 0.015);
    
    // 3. Random tiện ích (Mỗi chỗ có 3-8 tiện ích)
    const randomAmenities = AMENITIES_POOL.filter(() => Math.random() > 0.6);
    // Đảm bảo ít nhất có nước nóng (cho nó xịn :D)
    if (!randomAmenities.includes('hot_water')) randomAmenities.push('hot_water');

    const data = {
      name: `${BATH_NAMES[Math.floor(Math.random() * BATH_NAMES.length)]} ${district.name} #${i + 1}`,
      address: `Đường số ${Math.floor(Math.random() * 20) + 1}, ${district.name}, TP.HCM`,
      price: Math.floor(Math.random() * 10) * 5000 + 10000, // Giá từ 10k - 60k
      amenities: randomAmenities,
      createdBy: 'admin_seed@wcmap.vn',
      status: 'approved',
      rating: Number((3 + Math.random() * 2).toFixed(1)), // Rating từ 3.0 đến 5.0
      ratingCount: Math.floor(Math.random() * 200) + 1, // Số lượt đánh giá ảo
      latitude: lat,
      longitude: lng,
      type: 'bathhouse',
      createdAt: new Date().toISOString(),
      image: IMAGES[Math.floor(Math.random() * IMAGES.length)]
    };

    promises.push(addDoc(collection(db, "toilets"), data));
  }

  // Chạy song song cho lẹ
  await Promise.all(promises);
};