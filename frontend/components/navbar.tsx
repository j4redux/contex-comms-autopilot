import Link from "next/link";

import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function Navbar() {
  return (
    <div className="flex justify-between items-center">
      <Link href="/" passHref>
        <h1 className="text-lg font-bold">Contex</h1>
      </Link>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0">
          <Link
            href="/"
            className="hover:opacity-45 transition-opacity duration-300"
          >
            Home
          </Link>
          </div>
        <ThemeToggle />
      </div>
    </div>
  );
}
