import PageGuard from "@/components/PageGuard";
import Client from "./Client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <PageGuard resource="audit" action="view">
      <Client />
    </PageGuard>
  );
}
