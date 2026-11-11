import { useEffect, useRef, useState } from "react";
import { TextInput, View, type TextInputProps } from "react-native";
import { Fonts, Radius } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";
import { Muted } from "./ui";

type Props = TextInputProps & { label: string; suffix?: string };

export function Field({ label, suffix, style, ...p }: Props) {
  const colors = useColors();
  return (
    <View style={{ gap: 6, flex: 1 }}>
      <Muted style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{label}</Muted>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "rgba(255,255,255,0.05)",
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: Radius.md,
          paddingHorizontal: 14,
        }}
      >
        <TextInput
          placeholderTextColor={colors.mutedForeground}
          {...p}
          style={[{ flex: 1, minWidth: 0, width: 0, paddingVertical: 12, fontFamily: Fonts.bodyBold, fontSize: 16, color: colors.foreground }, style]}
        />
        {suffix ? <Muted>{suffix}</Muted> : null}
      </View>
    </View>
  );
}

export function NumberField({
  value,
  onChange,
  ...p
}: Omit<Props, "value" | "onChangeText" | "onChange"> & { value: number | null; onChange: (n: number | null) => void }) {
  const [text, setText] = useState(value === null || Number.isNaN(value) ? "" : String(value));
  const lastEmitted = useRef(value);
  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setText(value === null || Number.isNaN(value) ? "" : String(value));
    }
  }, [value]);
  return (
    <Field
      {...p}
      keyboardType="decimal-pad"
      value={text}
      onChangeText={(t) => {
        const clean = t.replace(",", ".");
        if (!/^\d*\.?\d*$/.test(clean)) return;
        setText(clean);
        const n = clean === "" || clean === "." ? null : Number(clean);
        lastEmitted.current = n;
        onChange(n);
      }}
    />
  );
}
