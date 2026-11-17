import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { WebView } from "react-native-webview";
import { useRouter } from "expo-router";
import { saveToken } from "../../lib/auth";
import { theme } from "../../lib/theme";

interface MobileLoginWebViewProps {
  visible: boolean;
  url: string;
  onDismiss: () => void;
}

export default function MobileLoginWebView({
  visible,
  url,
  onDismiss,
}: MobileLoginWebViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleMessage = async (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "AUTH_SUCCESS" && data.token) {
        await saveToken(data.token);
        onDismiss();
        router.replace("/(tabs)");
      }
    } catch {
      // Ignore unparseable messages
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onDismiss}
    >
      <SafeAreaView style={styles.container}>
        {/* Header with Cancel button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onDismiss} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sign In</Text>
          <View style={{ width: 50 }} />
        </View>

        {loading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={styles.loaderText}>Loading sign in...</Text>
          </View>
        )}

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={onDismiss} style={styles.retryButton}>
              <Text style={styles.retryText}>Close</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <WebView
            source={{ uri: url }}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError("Failed to load authentication page. Check network connection.");
            }}
            onMessage={handleMessage}
            style={styles.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  header: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  cancelButton: {
    paddingVertical: 6,
  },
  cancelText: {
    color: theme.muted,
    fontSize: 16,
  },
  headerTitle: {
    color: theme.text,
    fontSize: 17,
    fontWeight: "600",
  },
  webview: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  loaderContainer: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.bg,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    gap: 12,
  },
  loaderText: {
    color: theme.muted,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  errorText: {
    color: theme.danger,
    fontSize: 15,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: theme.card,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryText: {
    color: theme.text,
    fontSize: 14,
  },
});
