"use client";

import { ItemRow } from "./ItemRow";
import type { Item, Note } from "@notes/shared";

interface NoteCardProps {
  note: Note | Item;
  initialBookmarked?: boolean;
}

export function NoteCard({ note, initialBookmarked = false }: NoteCardProps) {
  return <ItemRow item={note} initialBookmarked={initialBookmarked} />;
}
