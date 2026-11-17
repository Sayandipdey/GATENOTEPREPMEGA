import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { theme } from "../lib/theme";
import { viewNote, toggleBookmark, type Note } from "../lib/api";

interface NoteCardProps {
  note: Note;
  initialBookmarked?: boolean;
  onBookmarkToggled?: (bookmarked: boolean) => void;
}

export default function NoteCard({
  note,
  initialBookmarked = false,
  onBookmarkToggled,
}: NoteCardProps) {
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [views, setViews] = useState(note.viewCount);

  const getEmojiForType = () => {
    if (note.kind === "image") return "🖼️";
    switch (note.type) {
      case "pdf":
        return "📄";
      case "ppt":
        return "📊";
      case "doc":
        return "📝";
      default:
        return "📁";
    }
  };

  const handleOpen = async () => {
    // Record view fire-and-forget
    viewNote(note.id).catch(() => {});
    setViews((v) => v + 1);

    const targetUrl = note.imageUrl || note.megaFileLink;
    if (!targetUrl) return;

    try {
      await WebBrowser.openBrowserAsync(targetUrl);
    } catch {
      Linking.openURL(targetUrl).catch(() => {});
    }
  };

  const handleBookmark = async () => {
    const nextState = !isBookmarked;
    setIsBookmarked(nextState);
    if (onBookmarkToggled) onBookmarkToggled(nextState);

    try {
      await toggleBookmark(note.id, nextState ? "add" : "remove");
    } catch {
      // Revert if failed
      setIsBookmarked(!nextState);
      if (onBookmarkToggled) onBookmarkToggled(!nextState);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.main}>
        <Text style={styles.icon}>{getEmojiForType()}</Text>
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {note.title}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.typeTag}>{(note.kind === "image" ? "DIAGRAM" : (note.type || "FILE")).toUpperCase()}</Text>
            <Text style={styles.metaText}>{views} views</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.bookmarkButton}
          onPress={handleBookmark}
          activeOpacity={0.6}
        >
          <Text style={styles.bookmarkIcon}>{isBookmarked ? "★" : "☆"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.openButton}
          onPress={handleOpen}
          activeOpacity={0.7}
        >
          <Text style={styles.openButtonText}>Open ↗</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  main: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.text,
    lineHeight: 18,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  typeTag: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.muted,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: 3,
  },
  metaText: {
    fontSize: 11,
    color: theme.muted,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bookmarkButton: {
    padding: 6,
  },
  bookmarkIcon: {
    fontSize: 20,
    color: "#FBBF24",
  },
  openButton: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    borderWidth: 1,
    borderColor: theme.accent,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  openButtonText: {
    color: theme.accent,
    fontSize: 12,
    fontWeight: "600",
  },
});
