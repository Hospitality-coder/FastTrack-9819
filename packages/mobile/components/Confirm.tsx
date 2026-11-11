import { Pressable, Switch, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { Sheet } from "./Sheet";
import { Body, Muted, Pill, Row } from "./ui";

/** Cross-platform confirm dialog (Alert.alert has no multi-button support on web). */
export function Confirm({
  visible,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Confirm",
  danger,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body?: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title} subtitle={body}>
      <Row style={{ gap: 10 }}>
        <Pill label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
        <Pill label={confirmLabel} variant={danger ? "danger" : "primary"} onPress={onConfirm} loading={loading} style={{ flex: 1 }} />
      </Row>
    </Sheet>
  );
}

export function ToggleRow({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable onPress={() => !disabled && onChange(!value)} style={{ opacity: disabled ? 0.5 : 1 }}>
      <Row style={{ justifyContent: "space-between", gap: 12, paddingVertical: 6 }}>
        <View style={{ flex: 1 }}>
          <Body style={{ fontFamily: "Manrope_700Bold" }}>{label}</Body>
          {hint ? <Muted style={{ marginTop: 2 }}>{hint}</Muted> : null}
        </View>
        <Switch
          value={value}
          onValueChange={onChange}
          disabled={disabled}
          trackColor={{ false: "#1E2E20", true: colors.primary }}
          thumbColor={value ? colors.primaryForeground : "#8A9A8C"}
        />
      </Row>
    </Pressable>
  );
}
