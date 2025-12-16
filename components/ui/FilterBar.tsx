// components/ui/FilterBar.tsx
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

// Định nghĩa Props để component này linh hoạt
interface FilterBarProps {
  options: string[]; // Danh sách các option: ['All', '5 Sao', 'Sạch sẽ'...]
  selectedOption: string;
  onSelect: (option: string) => void;
}

export default function FilterBar({ options, selectedOption, onSelect }: FilterBarProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      {options.map((opt) => (
        <TouchableOpacity 
          key={opt} 
          onPress={() => onSelect(opt)}
          style={[
            styles.chip, 
            selectedOption === opt && styles.chipActive // Style khi được chọn
          ]}
        >
          <Text style={selectedOption === opt ? styles.textActive : styles.textNormal}>
            {opt}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 10, paddingHorizontal: 16 },
  chip: { padding: 8, marginRight: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ddd' },
  chipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' }, // Màu xanh chủ đạo
  textNormal: { color: '#333' },
  textActive: { color: '#fff', fontWeight: 'bold' },
});