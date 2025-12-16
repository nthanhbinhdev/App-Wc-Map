import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  "Làm sao để tìm WC gần nhất?",
  "Giá của các địa điểm như thế nào?",
  "Làm sao để báo lỗi sự cố?",
  "Có WC miễn phí không?",
];

export default function AIChatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Xin chào! Tôi là trợ lý ảo của WC Map SG. Tôi có thể giúp bạn:\n\n• Tìm nhà vệ sinh gần nhất\n• Hướng dẫn sử dụng ứng dụng\n• Giải đáp thắc mắc về dịch vụ\n• Hỗ trợ báo cáo sự cố\n\nBạn cần hỗ trợ gì?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // 👉 HÀM GỌI GEMINI API
  const generateAIResponse = async (userMessage: string): Promise<string> => {
    try {
      const apiKey = "AIzaSyA60CwNy8QLxgYXOzZrRGeGMiX_trHez1w"; // API Key sẽ được môi trường tự động điền (hoặc ông điền key của ông vào đây)
      const systemPrompt = `Bạn là trợ lý AI của ứng dụng WC Map SG - ứng dụng tìm kiếm nhà vệ sinh công cộng tại Sài Gòn.
      
Nhiệm vụ của bạn:
- Tư vấn người dùng về cách sử dụng ứng dụng
- Hướng dẫn tìm kiếm WC gần nhất
- Giải thích các tính năng: check-in QR, đánh giá, báo lỗi
- Trả lời câu hỏi về giá cả và dịch vụ
- Hỗ trợ giải quyết vấn đề kỹ thuật cơ bản

Phong cách giao tiếp:
- Thân thiện, lịch sự, nhiệt tình, đậm chất Gen Z một chút
- Ngắn gọn, súc tích (2-3 câu)
- Dùng emoji phù hợp 😊🚻
- Gợi ý hành động cụ thể
- Không bịa thông tin không có

Nếu không biết câu trả lời, hãy trung thực và gợi ý liên hệ support@wcmap.vn.`;

      // Cấu hình request tới Gemini
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userMessage }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
          }),
        }
      );

      const data = await response.json();

      // Parse kết quả từ Gemini
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      } else {
        console.log("Gemini response error:", JSON.stringify(data));
        return "Xin lỗi, tôi đang gặp chút vấn đề kết nối. Bạn thử lại sau chút nhé! 😅";
      }
    } catch (error) {
      console.error("AI Error:", error);
      return "Rất tiếc, mạng đang lag quá. Bạn kiểm tra lại wifi xem sao nha!";
    }
  };

  const handleSend = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText) return;

    // 1. Hiển thị tin nhắn người dùng
    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    // Scroll xuống dưới
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // 2. Gọi AI và hiển thị câu trả lời
    const aiResponseText = await generateAIResponse(messageText);

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: aiResponseText,
      isUser: false,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, aiMessage]);
    setIsLoading(false);

    // Scroll lần nữa
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageBubble,
        item.isUser ? styles.userBubble : styles.aiBubble,
      ]}
    >
      {!item.isUser && (
        <View style={styles.aiAvatar}>
          <Ionicons name="chatbubble-ellipses" size={16} color="white" />
        </View>
      )}
      <View
        style={[
          styles.messageContent,
          item.isUser ? styles.userContent : styles.aiContent,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            item.isUser ? styles.userText : styles.aiText,
          ]}
        >
          {item.text}
        </Text>
        <Text style={styles.timestampText}>
          {item.timestamp.toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.aiHeaderAvatar}>
            <Ionicons name="chatbubble-ellipses" size={24} color="white" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Trợ lý AI</Text>
            <View style={styles.statusRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.statusText}>Sẵn sàng hỗ trợ</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Suggested Questions (chỉ hiện khi chưa chat nhiều) */}
      {messages.length === 1 && (
        <View style={styles.suggestedContainer}>
          <Text style={styles.suggestedTitle}>Bạn muốn hỏi gì?</Text>
          {SUGGESTED_QUESTIONS.map((question, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestedBtn}
              onPress={() => handleSend(question)}
            >
              <Text style={styles.suggestedText}>{question}</Text>
              <Ionicons name="arrow-forward" size={16} color="#2196F3" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
      />

      {/* Loading */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#2196F3" />
          <Text style={styles.loadingText}>Trợ lý đang suy nghĩ...</Text>
        </View>
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Nhập câu hỏi của bạn..."
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={() => handleSend()}
          disabled={!inputText.trim() || isLoading}
        >
          <Ionicons name="send" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    backgroundColor: "#2196F3",
    paddingTop: Platform.OS === "ios" ? 50 : 20, // Fix status bar padding
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  aiHeaderAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4CAF50",
    borderWidth: 1,
    borderColor: "white",
  },
  statusText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
  },
  suggestedContainer: {
    padding: 20,
    backgroundColor: "white",
    margin: 15,
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  suggestedTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 12,
  },
  suggestedBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  suggestedText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  messageList: {
    padding: 15,
    paddingBottom: 10,
  },
  messageBubble: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-end",
  },
  userBubble: {
    justifyContent: "flex-end",
  },
  aiBubble: {
    justifyContent: "flex-start",
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2196F3",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  messageContent: {
    maxWidth: "75%",
    padding: 12,
    borderRadius: 16,
  },
  userContent: {
    backgroundColor: "#2196F3",
    marginLeft: "auto",
    borderBottomRightRadius: 4,
  },
  aiContent: {
    backgroundColor: "white",
    borderBottomLeftRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: "white",
  },
  aiText: {
    color: "#333",
  },
  timestampText: {
    fontSize: 10,
    color: "#rgba(0,0,0,0.3)", // Dùng màu trong suốt nhẹ
    marginTop: 4,
    textAlign: "right",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 15,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    alignItems: "flex-end",
    gap: 10,
    paddingBottom: Platform.OS === "ios" ? 25 : 15, // Padding for safe area
  },
  input: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: "#333",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2196F3",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  sendBtnDisabled: {
    backgroundColor: "#B0BEC5",
    elevation: 0,
  },
});
