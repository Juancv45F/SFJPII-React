import { StyleProp, ViewStyle } from 'react-native';
import { WebView, WebViewMessageEvent } from './WebViewCompat';

export type HtmlFrameProps = { html: string; onMessage?: (data: string) => void; style?: StyleProp<ViewStyle> };

// Página HTML embebida: WebView en nativo; iframe en web (HtmlFrame.web.tsx).
export function HtmlFrame({ html, onMessage, style }: HtmlFrameProps) {
  return (
    <WebView
      originWhitelist={['*']}
      source={{ html }}
      style={style}
      onMessage={(e: WebViewMessageEvent) => onMessage?.(e.nativeEvent.data)}
      setSupportMultipleWindows={false}
    />
  );
}
