import { Alert, Platform } from "react-native";

export interface AlertButton {
  text:    string;
  onPress?: () => void | Promise<void>;
  style?:  "cancel" | "destructive" | "default";
}

/**
 * Alert.alert 크로스 플랫폼 래퍼.
 * iOS/Android: 네이티브 Alert.alert
 * Web (Safari Expo 미리보기): window.alert / window.confirm 으로 폴백
 *   - 버튼 1개 또는 없음: alert
 *   - 버튼 2개 (cancel + 확인): confirm
 *   - 버튼 3개 이상: 순차 confirm — 첫 confirm에서 첫 액션(쿨다운),
 *     취소 시 두 번째 confirm 으로 다음 액션(즉시 보유) 제안
 */
export function showAlert(title: string, message: string, buttons?: AlertButton[]) {
  if (Platform.OS !== "web") {
    Alert.alert(title, message, buttons as any);
    return;
  }

  const w: any = globalThis as any;
  const list = buttons ?? [];

  if (list.length <= 1) {
    w.alert(`${title}\n\n${message}`);
    list[0]?.onPress?.();
    return;
  }

  const cancel  = list.find(b => b.style === "cancel");
  const actions = list.filter(b => b.style !== "cancel");

  // 액션 1개: 단일 confirm
  if (actions.length === 1) {
    const ok = w.confirm(`${title}\n\n${message}\n\n[확인] = ${actions[0].text}`);
    if (ok) actions[0].onPress?.();
    else cancel?.onPress?.();
    return;
  }

  // 액션 여러 개: 순차 confirm
  const baseMsg = `${title}\n\n${message}`;
  for (const a of actions) {
    const ok = w.confirm(`${baseMsg}\n\n[확인] = ${a.text}\n[취소] = 다음 옵션 보기`);
    if (ok) {
      a.onPress?.();
      return;
    }
  }
  cancel?.onPress?.();
}
