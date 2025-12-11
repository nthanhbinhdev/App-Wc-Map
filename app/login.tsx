import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
// 👉 Import thêm mấy món này để ghi dữ liệu
import { doc, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
// 👉 Import db
import { auth, db } from '../firebaseConfig';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false); // Thêm loading cho chuyên nghiệp

  const handleLogin = async () => {
    if (email === '' || password === '') {
      Alert.alert('Lỗi', 'Vui lòng nhập đủ thông tin');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Đăng nhập thành công -> _layout.tsx sẽ tự chuyển trang
    } catch (error: any) {
      Alert.alert('Lỗi đăng nhập', error.message);
      setLoading(false);
    }
  };

  // 👉 LOGIC ĐĂNG KÝ MỚI (QUAN TRỌNG)
  const handleRegister = async () => {
    if (email === '' || password === '') {
      Alert.alert('Lỗi', 'Vui lòng nhập đủ thông tin');
      return;
    }
    setLoading(true);
    try {
      // 1. Tạo tài khoản Auth (Email/Pass)
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Tạo hồ sơ trong Database (Firestore)
      // Tên bảng: 'users', ID bản ghi: trùng với UID của user
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        role: 'user', // 👈 Mặc định là khách thường
        createdAt: new Date().toISOString(),
        displayName: 'Người dùng mới'
      });

      Alert.alert('Thành công', 'Tài khoản đã tạo! Đang đăng nhập...');
      // Không cần làm gì thêm, _layout sẽ tự chuyển trang
    } catch (error: any) {
      Alert.alert('Lỗi đăng ký', error.message);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={{ fontSize: 80, marginBottom: 20 }}>:)</Text>
      <Text style={styles.title}>WC MAP SG</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Mật khẩu"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {loading ? (
        <ActivityIndicator size="large" color="#2196F3" style={{marginTop: 20}} />
      ) : (
        <>
          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>ĐĂNG NHẬP NGAY</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.buttonOutline]} onPress={handleRegister}>
            <Text style={[styles.buttonText, styles.buttonOutlineText]}>ĐĂNG KÝ MỚI</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#E3F2FD' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 40, color: '#1565C0' },
  input: { width: '100%', height: 50, backgroundColor: 'white', borderRadius: 10, paddingHorizontal: 15, marginBottom: 15, borderWidth: 1, borderColor: '#bbdefb' },
  button: { width: '100%', height: 50, backgroundColor: '#2196F3', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  buttonOutline: { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#2196F3', marginTop: 10 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  buttonOutlineText: { color: '#2196F3' },
});