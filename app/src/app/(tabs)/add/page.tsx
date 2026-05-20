import { ThemedPageShell } from "@/components/ThemedPageShell";
import { AddTabClient } from "@/components/AddTabClient";

export default function AddPage() {
  return (
    <ThemedPageShell title="Add">
      <AddTabClient />
    </ThemedPageShell>
  );
}
