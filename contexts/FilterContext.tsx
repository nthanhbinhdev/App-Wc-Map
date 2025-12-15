import React, { createContext, ReactNode, useContext, useState } from 'react';

// 👉 DANH SÁCH BỘ LỌC DÙNG CHUNG CHO CẢ 2 TAB
// Type: 'sort' (chọn 1) | 'filter' (chọn nhiều)
export const SHARED_FILTER_OPTIONS = [
    { id: 'sort_distance', label: 'Gần tôi 🏃', icon: 'walk', type: 'sort' },
    { id: 'filter_available', label: 'Còn phòng', icon: 'time', type: 'filter' },
    { id: 'sort_price', label: 'Giá tốt', icon: 'pricetag', type: 'sort' },
    { id: 'sort_rating', label: 'Đánh giá cao', icon: 'star', type: 'sort' },
    { id: 'filter_hot_water', label: 'Nước nóng', icon: 'thermometer', type: 'filter' },
    { id: 'filter_sauna', label: 'Xông hơi', icon: 'cloud', type: 'filter' },
    { id: 'filter_wifi', label: 'Wifi Free', icon: 'wifi', type: 'filter' },
    { id: 'filter_parking', label: 'Giữ xe', icon: 'bicycle', type: 'filter' },
    { id: 'filter_locker', label: 'Tủ đồ', icon: 'lock-closed', type: 'filter' },
    { id: 'filter_hair_dryer', label: 'Máy sấy', icon: 'color-wand', type: 'filter' },
    { id: 'filter_towel', label: 'Khăn tắm', icon: 'shirt', type: 'filter' },
    { id: 'filter_accessible', label: 'Xe lăn', icon: 'accessibility', type: 'filter' },
];

interface FilterContextType {
    activeSort: string;
    setActiveSort: (id: string) => void;
    activeFilters: string[];
    setActiveFilters: React.Dispatch<React.SetStateAction<string[]>>;
    searchQuery: string;
    setSearchQuery: (text: string) => void;
    handleToggleFilter: (id: string, type: string) => void;
    resetFilters: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider = ({ children }: { children: ReactNode }) => {
    const [activeSort, setActiveSort] = useState('sort_distance'); // Mặc định sắp xếp theo khoảng cách
    const [activeFilters, setActiveFilters] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const handleToggleFilter = (id: string, type: string) => {
        if (type === 'sort') {
            setActiveSort(id);
        } else {
            if (activeFilters.includes(id)) {
                setActiveFilters(prev => prev.filter(item => item !== id));
            } else {
                setActiveFilters(prev => [...prev, id]);
            }
        }
    };

    const resetFilters = () => {
        setActiveSort('sort_distance');
        setActiveFilters([]);
        setSearchQuery('');
    };

    return (
        <FilterContext.Provider value={{ 
            activeSort, setActiveSort, 
            activeFilters, setActiveFilters, 
            searchQuery, setSearchQuery,
            handleToggleFilter,
            resetFilters
        }}>
            {children}
        </FilterContext.Provider>
    );
};

export const useFilters = () => {
    const context = useContext(FilterContext);
    if (!context) {
        throw new Error("useFilters must be used within a FilterProvider");
    }
    return context;
};