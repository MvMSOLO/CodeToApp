import { createFileRoute } from "@tanstack/react-router";
import { PreviewApp } from "@/components/nexus/PreviewApp";

export const Route = createFileRoute("/run")({
  component: PreviewApp,
});
