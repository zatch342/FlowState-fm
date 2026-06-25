import "./globals.css";
import Providers from "./Providers/SessionProvider";

export const metadata = {
  title: "FlowState.fm",
  description: "AI-powered vibe music platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
