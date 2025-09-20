import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vibe Checker",
  description: "Check the predictions from candidate classifiers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
