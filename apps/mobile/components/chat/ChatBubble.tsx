import { View, Text } from "react-native";
import { MotiView } from "moti";
import type { ChatMessage } from "../../lib/stores/chat";

type Props = {
  message: ChatMessage;
  index: number;
};

export function ChatBubble({ message, index }: Props) {
  const isUser = message.role === "user";

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10, scale: 0.95 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      transition={{
        type: "spring",
        damping: 20,
        stiffness: 200,
        delay: index * 50,
      }}
      className={`mb-2 max-w-[85%] ${isUser ? "self-end" : "self-start"}`}
    >
      <View
        className={`rounded-2xl px-4 py-2.5 ${
          isUser
            ? "rounded-br-md bg-blush-400"
            : "rounded-bl-md bg-stone-100/80"
        }`}
      >
        <Text
          className={`text-[15px] leading-5 ${
            isUser ? "text-white" : "text-stone-800"
          }`}
        >
          {message.content}
        </Text>
      </View>
    </MotiView>
  );
}
