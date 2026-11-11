import type { PropsWithChildren } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { Radius } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";
import { Display, Muted } from "./ui";

type Props = PropsWithChildren<{ visible: boolean; onClose: () => void; title: string; subtitle?: string }>;

/** Bottom sheet modal. */
export function Sheet({ visible, onClose, title, subtitle, children }: Props) {
  const colors = useColors();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }} onPress={onClose} />
        <View
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: Radius.xl,
            borderTopRightRadius: Radius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 34,
            maxHeight: "88%",
          }}
        >
          <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 14 }} />
          <Display style={{ fontSize: 18 }}>{title}</Display>
          {subtitle ? <Muted style={{ marginTop: 4 }}>{subtitle}</Muted> : null}
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: 16, gap: 14 }} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
