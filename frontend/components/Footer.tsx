import Link from "next/link";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Footer() {
  return (
    <footer className="flex h-[48px] items-center justify-end gap-[34px] bg-[#EDECE8] px-8 md:px-16 xl:px-[108px]">
    <a
      href="/terms"
      className="text-xs uppercase tracking-widest text-[#615050] underline-offset-4 hover:underline"
    >
      Terms of Service
    </a>

    <span className="text-[#B5ACAC]">|</span>

    <a
      href="/privacy"
      className="text-xs uppercase tracking-widest text-[#615050] underline-offset-4 hover:underline"
    >
      Privacy Policy
    </a>
     <LanguageSwitcher />
  </footer>
  );
}