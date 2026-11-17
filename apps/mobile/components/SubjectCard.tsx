import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useRouter } from "expo-router";
import { theme } from "../lib/theme";
import type { Subject } from "../lib/api";

interface SubjectCardProps {
  subject: Subject;
}

export default function SubjectCard({ subject }: SubjectCardProps) {
  const router = useRouter();

  const initials = subject.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => router.push(`/subject/${subject.id}` as any)}
    >
      {/* 96px top banner with distinct background */}
      <View style={styles.banner}>
        {subject.thumbnailUrl ? (
          <Image source={{ uri: subject.thumbnailUrl }} style={styles.thumbnailImage} resizeMode="cover" />
        ) : (
          <View style={styles.monogramBanner}>
            <Text style={styles.monogramLarge}>{initials || "GT"}</Text>
          </View>
        )}

        <View style={styles.floatingBadge}>
          <Text style={styles.badgeText}>{subject.category || "Core"}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {subject.name}
        </Text>

        {subject.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {subject.description}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.itemCountText}>
            {typeof subject.itemCount === "number" ? `${subject.itemCount} notes` : "View notes"}
          </Text>
          <Text style={styles.linkText}>Open →</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.card,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: "hidden",
  },
  banner: {
    height: 96,
    width: "100%",
    backgroundColor: theme.surface,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  monogramBanner: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  monogramLarge: {
    fontSize: 28,
    fontWeight: "800",
    color: "rgba(99, 102, 241, 0.35)",
    letterSpacing: 2,
  },
  floatingBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.3)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.accent,
  },
  body: {
    padding: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  description: {
    fontSize: 12,
    color: theme.muted,
    lineHeight: 16,
    marginBottom: 10,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  itemCountText: {
    fontSize: 11,
    color: theme.muted,
  },
  linkText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.accent,
  },
});
