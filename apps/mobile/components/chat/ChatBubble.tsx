import { View, Text, Pressable, StyleSheet } from "react-native";
import { MotiView } from "moti";
import type { ChatMessage } from "../../lib/stores/chat";
import { useChatStore } from "../../lib/stores/chat";
import { GenerativeUIRenderer } from "./GenerativeUI";
import { colors, macroColors, glass, fonts } from "../../constants/Colors";

type Props = {
  message: ChatMessage;
  index: number;
};

export function ChatBubble({ message, index }: Props) {
  const isUser = message.role === "user";
  const hasUI = message.uiComponents && message.uiComponents.length > 0;
  const hasText = message.content && message.content.trim().length > 0;
  const hasError = !!message.error;

  if (hasError) {
    return <ErrorBubble message={message} index={index} />;
  }

  return (
    <MotiView
      from={{ opacity: 0, translateY: 12, scale: 0.96 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      transition={{
        type: "spring",
        damping: 18,
        stiffness: 280,
        delay: Math.min(index * 60, 300),
      }}
      style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}
    >
      {hasText ? (
        <View
          style={[
            styles.textContainer,
            isUser ? styles.textContainerUser : styles.textContainerAssistant,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              { fontFamily: fonts.regular },
              isUser ? styles.messageTextUser : styles.messageTextAssistant,
            ]}
          >
            {message.content}
          </Text>
        </View>
      ) : null}

      {hasUI ? (
        <View style={hasText ? { marginTop: 8 } : undefined}>
          <GenerativeUIRenderer components={message.uiComponents!} />
        </View>
      ) : null}
    </MotiView>
  );
}

// ---------------------------------------------------------------------------
// Error bubble — inline error with optional retry
// ---------------------------------------------------------------------------
function ErrorBubble({ message, index }: Props) {
  const retryLastMessage = useChatStore((s) => s.retryLastMessage);
  const isRetryable = message.error?.includes("retry") ||
    message.error?.includes("try again") ||
    message.error?.includes("taking too long");

  return (
    <MotiView
      from={{ opacity: 0, translateY: 12, scale: 0.96 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      transition={{
        type: "spring",
        damping: 18,
        stiffness: 280,
        delay: Math.min(index * 60, 300),
      }}
      style={[styles.bubble, styles.bubbleAssistant]}
    >
      <View style={styles.errorContainer}>
        <Text style={[styles.errorText, { fontFamily: fonts.medium }]}>
          {message.error}
        </Text>
        {isRetryable && (
          <Pressable onPress={retryLastMessage} style={styles.retryButton}>
            <Text style={[styles.retryText, { fontFamily: fonts.semibold }]}>
              Retry
            </Text>
          </Pressable>
        )}
      </View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  bubble: {
    marginBottom: 8,
    maxWidth: "85%",
  },
  bubbleUser: {
    alignSelf: "flex-end",
  },
  bubbleAssistant: {
    alignSelf: "flex-start",
  },
  textContainer: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  textContainerUser: {
    backgroundColor: macroColors.calories,
    borderBottomRightRadius: 6,
  },
  textContainerAssistant: {
    backgroundColor: glass.bg,
    borderBottomLeftRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderSubtle,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  messageTextUser: {
    color: "#FFFFFF",
  },
  messageTextAssistant: {
    color: colors.stone[800],
  },
  errorContainer: {
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(251,113,133,0.08)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(251,113,133,0.25)",
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.stone[600],
  },
  retryButton: {
    marginTop: 8,
    alignSelf: "flex-start",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: macroColors.calories,
  },
  retryText: {
    fontSize: 13,
    color: "#FFFFFF",
  },
});
