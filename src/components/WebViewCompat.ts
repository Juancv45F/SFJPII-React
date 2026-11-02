import { WebView as RNWebView } from 'react-native-webview';

// Los tipos de react-native-webview 14 colapsan a `never` con TS 6; se fija el genérico.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type Props = {};
export const WebView = RNWebView as unknown as typeof RNWebView<Props>;
export type WebViewRef = RNWebView<Props>;
export type { WebViewMessageEvent } from 'react-native-webview';
