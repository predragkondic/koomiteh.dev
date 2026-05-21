import DefaultPage from "./Layout/DefaultPage";

interface PlaceholderPageProps {
  titleKey: string;
  titleNs?: "common" | "admin";
}

export function PlaceholderPage({
  titleKey,
  titleNs = "common",
}: PlaceholderPageProps) {
  return <DefaultPage titleKey={titleKey} titleNs={titleNs} />;
}
