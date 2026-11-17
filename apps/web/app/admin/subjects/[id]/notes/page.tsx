import { redirect } from "next/navigation";

export default function LegacyNotesRedirect({ params }: { params: { id: string } }) {
  redirect(`/admin/subjects/${params.id}`);
}
