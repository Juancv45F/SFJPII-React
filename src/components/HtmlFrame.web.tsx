import { createElement, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import type { HtmlFrameProps } from './HtmlFrame';

// Shim para que el HTML use la misma API de mensajes que en el WebView nativo.
const SHIM = '<script>window.ReactNativeWebView={postMessage:function(d){parent.postMessage({__htmlFrame:true,data:String(d)},"*")}};</script>';

export function HtmlFrame({ html, onMessage, style }: HtmlFrameProps) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => {
    const listener = (e: MessageEvent) => {
      if (e.source === frame.current?.contentWindow && e.data?.__htmlFrame) onMessage?.(e.data.data);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [onMessage]);
  const srcDoc = html.replace('<head>', `<head>${SHIM}`);
  return (
    <View style={style}>
      {createElement('iframe', {
        ref: frame,
        srcDoc,
        title: 'mapa',
        style: { border: 0, width: '100%', height: '100%', ...StyleSheet.flatten(StyleSheet.absoluteFill) },
      })}
    </View>
  );
}
