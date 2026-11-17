import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Linking,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { getSubjectDetails, type Item, type Subject } from "../../lib/api";
import NoteCard from "../../components/NoteCard";
import Skeleton from "../../components/Skeleton";
import { theme } from "../../lib/theme";

export default function SubjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();

  const [subject, setSubject] = useState<Subject | null>(null);
  const [notes, setNotes] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getSubjectDetails(id);
      if (data) {
        setSubject(data);
        navigation.setOptions({ title: data.name || "Subject Notes" });
        setNotes(data.items || []);
      }
    } catch (err) {
      console.error("Failed to load subject notes:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, navigation]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleOpenFolder = async () => {
    if (!subject?.megaFolderLink) return;
    try {
      await WebBrowser.openBrowserAsync(subject.megaFolderLink);
    } catch {
      Linking.openURL(subject.megaFolderLink).catch(() => {});
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

      {loading ? (
        <View style={styles.skeletonContainer}>
          <Skeleton width="100%" height={100} borderRadius={14} />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} width="100%" height={70} borderRadius={12} />
          ))}
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NoteCard note={item} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.accent}
              colors={[theme.accent]}
            />
          }
          ListHeaderComponent={
            subject ? (
              <View style={styles.headerCard}>
                <View style={styles.badgeRow}>
                  <Text style={styles.codeBadge}>{subject.code}</Text>
                  <Text style={styles.semBadge}>Semester {subject.semester}</Text>
                </View>

                <Text style={styles.subjectTitle}>{subject.name}</Text>

                {subject.description ? (
                  <Text style={styles.subjectDesc}>{subject.description}</Text>
                ) : null}

                {subject.megaFolderLink ? (
                  <TouchableOpacity
                    style={styles.folderButton}
                    onPress={handleOpenFolder}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.folderButtonText}>
                      Open Course Folder in MEGA ↗
                    </Text>
                  </TouchableOpacity>
                ) : null}

                <View style={styles.notesDivider}>
                  <Text style={styles.notesHeading}>Available Notes ({notes.length})</Text>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📂</Text>
              <Text style={styles.emptyTitle}>No notes added yet</Text>
              <Text style={styles.emptyText}>
                The instructor has not added individual notes yet. Check the course MEGA folder above.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  skeletonContainer: {
    padding: 16,
    gap: 12,
  },
  headerCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  codeBadge: {
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "700",
    color: theme.accent,
    backgroundColor: "rgba(99, 102, 241, 0.12)",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  semBadge: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.success,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  subjectTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.text,
    lineHeight: 24,
    marginBottom: 6,
  },
  subjectDesc: {
    fontSize: 13,
    color: theme.muted,
    lineHeight: 18,
    marginBottom: 14,
  },
  folderButton: {
    backgroundColor: theme.accent,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  folderButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  notesDivider: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  notesHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.text,
    letterSpacing: 0.3,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.text,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: theme.muted,
    textAlign: "center",
    lineHeight: 18,
  },
});
