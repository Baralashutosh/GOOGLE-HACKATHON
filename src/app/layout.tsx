import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

/* Numbers carry the argument here, so they get a face with tabular figures
   that stay legible from the back of a room. */
const mono = JetBrains_Mono({
  variable: "--font-mono-face",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MedMesh, surplus to shortage before either becomes waste",
  description:
    "Public health systems stock out of medicines and expire the same medicines "
    + "in the same district, in the same quarter. MedMesh finds both and moves one to the other.",
};

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/console", label: "District console" },
  { href: "/capture", label: "Capture" },
  { href: "/method", label: "Method" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-ink-950">
        <header className="sticky top-0 z-50 border-b rule bg-ink-950/80 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-5">
            <Link href="/" className="group flex items-center gap-2.5">
              <MeshMark />
              <span className="text-[15px] font-semibold tracking-tight">
                Med<span className="text-flow">Mesh</span>
              </span>
            </Link>

            <nav className="ml-2 hidden items-center gap-1 sm:flex">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-1.5 text-[13px] text-ink-300 transition-colors hover:bg-ink-800 hover:text-ink-100"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-3">
              <span className="hidden text-[11px] uppercase tracking-[0.14em] text-ink-400 md:inline">
                Built with Google AI
              </span>
              <Link
                href="/console"
                className="rounded-md border border-flow/40 bg-flow/10 px-3 py-1.5 text-[13px] font-medium text-flow transition-colors hover:bg-flow/20"
              >
                Open console
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t rule">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-[12px] text-ink-400 sm:flex-row sm:items-center">
            <p>
              MedMesh, a prototype for Build with AI: Code for Communities, second edition.
            </p>
            <p className="sm:ml-auto">
              Figures calibrated to published studies. See{" "}
              <Link href="/method" className="text-ink-200 underline underline-offset-4 hover:text-flow">
                Method
              </Link>
              .
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

/**
 * The mark is the argument in miniature: isolated nodes on the left, the same
 * nodes joined on the right. Every supply system already has the dots.
 */
function MeshMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
      <circle cx="5" cy="7" r="2.4" className="fill-shortage" />
      <circle cx="5" cy="19" r="2.4" className="fill-expiry" />
      <circle cx="21" cy="13" r="2.4" className="fill-flow" />
      <path
        d="M5 7 L21 13 L5 19"
        className="stroke-flow"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />
    </svg>
  );
}
