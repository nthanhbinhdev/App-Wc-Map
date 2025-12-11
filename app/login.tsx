import { useRouter } from 'expo-router'; // Dùng cái này để chuyển trang
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth } from '../firebaseConfig';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (email === '' || password === '') {
      Alert.alert('Lỗi', 'Vui lòng nhập đủ thông tin');
      return;
    }
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // 👉 ĐĂNG NHẬP THÀNH CÔNG THÌ CHUYỂN VÀO NHÀ (HOME)
        // replace nghĩa là thay thế luôn, không cho user bấm Back để quay lại login
        router.replace('/(tabs)');
      })
      .catch((error) => {
        Alert.alert('Lỗi đăng nhập', error.message);
      });
  };

  const handleRegister = () => {
    // (Logic đăng ký giữ nguyên)
    if (email === '' || password === '') return;
    createUserWithEmailAndPassword(auth, email, password)
      .then(() => Alert.alert('Đăng ký thành công', 'Giờ hãy đăng nhập nhé!'))
      .catch((err) => Alert.alert('Lỗi', err.message));
  };

  return (
    <View style={styles.container}>
      {/* Icon WC to đùng cho đẹp */}
      <Text style={{ fontSize: 80, marginBottom: 20 }}>🚽</Text>
      <Text style={styles.title}>WC MAP SÀI GÒN</Text>

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

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>ĐĂNG NHẬP NGAY</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.buttonOutline]} onPress={handleRegister}>
        <Text style={[styles.buttonText, styles.buttonOutlineText]}>ĐĂNG KÝ MỚI</Text>
      </TouchableOpacity>
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