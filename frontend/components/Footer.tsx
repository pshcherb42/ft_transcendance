import Link from "next/link";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Footer() {
  return (
    <footer className="w-full border-t border-gray-800 py-4 px-6 text-sm text-gray-400 flex items-center justify-center gap-6">
      <Link href="/privacy" className="hover:text-white transition-colors">
        Privacy Policy
      </Link>
      <Link href="/terms" className="hover:text-white transition-colors">
        Terms of Service
      </Link>
      <LanguageSwitcher />
    </footer>
  );
}