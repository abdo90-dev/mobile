import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { Platform } from 'react-native';
import { WebView } from 'react-native-webview';

const RecaptchaWebView = forwardRef(({ siteKey, domain, onToken }, ref) => {
  const webViewRef = useRef(null);

  useImperativeHandle(ref, () => ({
    triggerCaptcha: () => {
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          document.getElementById('recaptcha-trigger')?.click();
        `);
      }
    },
  }));

  return (
    <WebView
      ref={webViewRef}
      source={{ uri: `https://${domain}/recaptcha.html?siteKey=${siteKey}` }}
      onMessage={(event) => onToken(event.nativeEvent.data)}
      javaScriptEnabled={true}  // Ensure JavaScript is enabled
      domStorageEnabled={true}   // Enable DOM storage (important for reCAPTCHA)
      originWhitelist={['*']}    // Allow all origins (for testing)
    />
  );
});

export default RecaptchaWebView;
