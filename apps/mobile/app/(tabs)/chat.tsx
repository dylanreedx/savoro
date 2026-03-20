import { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { useChatStore, type ChatMessage } from "../../lib/stores/chat";
import { ChatInput } from "../../components/chat/ChatInput";
import { ChatBubble } from "../../components/chat/ChatBubble";
import { DailySnapshot } from "../../components/chat/DailySnapshot";
import { ThinkingIndicator } from "../../components/chat/ThinkingIndicator";

const HEADER_FULL_HEIGHT = 220;
const HEADER_COMPACT_HEIGHT = 64;
const COLLAPSE_THRESHOLD = 60;
const EXPAND_THRESHOLD = 20;

export default function ChatScreen() {
  const messages = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);
  const loadMessages = useChatStore((s) => s.loadMessages);
  const fetchMacros = useChatStore((s) => s.fetchMacros);
  const fetchFavorites = useChatStore((s) => s.fetchFavorites);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const headerHeight = useRef(new Animated.Value(HEADER_FULL_HEIGHT)).current;

  useEffect(() => {
    loadMessages();
    fetchMacros();
    fetchFavorites();
  }, []);

  const animateHeader = useCallback(
    (collapsed: boolean) => {
      Animated.spring(headerHeight, {
        toValue: collapsed ? HEADER_COMPACT_HEIGHT : HEADER_FULL_HEIGHT,
        damping: 20,
        stiffness: 200,
        useNativeDriver: false,
      }).start();
    },
    [headerHeight],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      if (!headerCollapsed && offsetY > COLLAPSE_THRESHOLD) {
        setHeaderCollapsed(true);
        animateHeader(true);
      } else if (headerCollapsed && offsetY < EXPAND_THRESHOLD) {
        setHeaderCollapsed(false);
        animateHeader(false);
      }
    },
    [headerCollapsed, animateHeader],
  );

  const handleExpand = useCallback(() => {
    setHeaderCollapsed(false);
    animateHeader(false);
  }, [animateHeader]);

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
        {/* Collapsible DailySnapshot header */}
        {isEmpty ? (
          <View className="flex-1 justify-center">
            <DailySnapshot />
          </View>
        ) : (
          <>
            <Animated.View style={{ height: headerHeight, overflow: "hidden" }}>
              <View className="pt-2 pb-2">
                {headerCollapsed ? (
                  <DailySnapshot compact onExpand={handleExpand} />
                ) : (
                  <DailySnapshot />
                )}
              </View>
            </Animated.View>

            <FlatList
              ref={flatListRef}
              data={reversed}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <ChatBubble message={item} index={index} />
              )}
              ListHeaderComponent={isLoading ? <ThinkingIndicator /> : null}
              inverted
              onScroll={handleScroll}
              scrollEventThrottle={16}
              contentContainerStyle={{
                flexGrow: 1,
                paddingHorizontal: 16,
                paddingBottom: 8,
              }}
              showsVerticalScrollIndicator={false}
            />
          </>
        )}

        {/* Input bar */}
        <ChatInput />
      </View>
    </KeyboardAvoidingView>
  );
}
