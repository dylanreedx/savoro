import { useEffect, useRef } from "react";
import { View, FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { useChatStore, type ChatMessage } from "../../lib/stores/chat";
import { MacroRing } from "../../components/chat/MacroRing";
import { ChatInput } from "../../components/chat/ChatInput";
import { ChatBubble } from "../../components/chat/ChatBubble";
import { DailySnapshot } from "../../components/chat/DailySnapshot";

export default function ChatScreen() {
  const messages = useChatStore((s) => s.messages);
  const loadMessages = useChatStore((s) => s.loadMessages);
  const fetchMacros = useChatStore((s) => s.fetchMacros);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    loadMessages();
    fetchMacros();
  }, []);

  const isEmpty = messages.length === 0;

  // Inverted FlatList expects newest-first ordering
  const reversed = [...messages].reverse();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-stone-50"
      keyboardVerticalOffset={88}
    >
      <View className="flex-1">
        {/* Persistent macro ring */}
        <View className="pb-2 pt-2">
          <MacroRing />
        </View>

        {/* Messages or empty state */}
        {isEmpty ? (
          <View className="flex-1 justify-center">
            <DailySnapshot />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={reversed}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <ChatBubble message={item} index={index} />
            )}
            inverted
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: 16,
              paddingBottom: 8,
            }}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Input bar */}
        <ChatInput />
      </View>
    </KeyboardAvoidingView>
  );
}
