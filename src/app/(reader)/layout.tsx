// The Reader is a full-screen immersive experience — deliberately outside
// the (public) route group so it renders without the site header/nav.
export default function ReaderLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
