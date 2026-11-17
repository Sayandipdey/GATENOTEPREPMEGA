import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { theme } from "../../lib/theme";
import { API_BASE_URL } from "../../lib/constants";
import MobileLoginWebView from "../../components/auth/MobileLoginWebView";

export default function LoginScreen() {
  const [showWebView, setShowWebView] = useState(false);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

      <View style={styles.content}>
        {/* Logo / branding area */}
        <View style={styles.logoArea}>
          <Text style={styles.logoEmoji}>📚</Text>
        </View>

        <Text style={styles.title}>Notes Platform</Text>
        <Text style={styles.subtitle}>
          Sign in to access your study materials
        </Text>

        <TouchableOpacity
          style={styles.signInButton}
          onPress={() => setShowWebView(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.signInButtonText}>Sign In with OTP</Text>
        </TouchableOpacity>
      </View>

      {/* WebView modal — points to {API_BASE_URL}/mobile-login which will
          postMessage({ type: "AUTH_SUCCESS", token: string }) after OTP verification */}
      <MobileLoginWebView
        visible={showWebView}
        url={`${API_BASE_URL}/mobile-login`}
        onDismiss={() => setShowWebView(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    width: "100%",
    paddingHorizontal: 32,
    alignItems: "center",
  },
  logoArea: {
    marginBottom: 24,
  },
  logoEmoji: {
    fontSize: 64,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: theme.text,
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: theme.muted,
    textAlign: "center",
    marginBottom: 48,
    lineHeight: 24,
  },
  signInButton: {
    backgroundColor: theme.accent,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  signInButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
});
