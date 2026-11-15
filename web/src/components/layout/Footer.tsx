import Link from "next/link";
import { MediaForgeMark } from "@/components/ui/MediaForgeMark";

export function Footer() {
  return (
    <footer className="border-t border-outline-variant/30 bg-surface-container-lowest/80 dark:bg-slate-950/80 backdrop-blur-xl text-on-surface-variant dark:text-slate-200 text-sm transition-colors mt-auto">
      <div className="max-w-7xl mx-auto px-gutter py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center text-white shadow-md">
                <MediaForgeMark className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold text-on-surface dark:text-white">MediaForge</span>
            </Link>
            <p className="text-xs leading-relaxed text-on-surface-variant dark:text-slate-200">
              Precision media processing suite combining authorized stream extraction with versatile client and offline media transcoding.
            </p>

          </div>

          {/* Tools */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface dark:text-slate-200 mb-3">
              Media Processing
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/downloader" className="hover:text-primary dark:hover:text-violet-300 transition-colors">
                  Media Downloader
                </Link>
              </li>
              <li>
                <Link href="/converter/video" className="hover:text-primary dark:hover:text-violet-300 transition-colors">
                  Video Editor
                </Link>
              </li>
              <li>
                <Link href="/converter/audio" className="hover:text-primary dark:hover:text-violet-300 transition-colors">
                  Audio Editor
                </Link>
              </li>
              <li>
                <Link href="/converter/image" className="hover:text-primary dark:hover:text-violet-300 transition-colors">
                  Image Editor
                </Link>
              </li>
              <li>
                <Link href="/converter/batch" className="hover:text-primary dark:hover:text-violet-300 transition-colors">
                  Batch Converter
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface dark:text-slate-200 mb-3">
              Resources & Specs
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/formats" className="hover:text-primary dark:hover:text-violet-300 transition-colors">
                  Supported Formats Catalog
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-primary dark:hover:text-violet-300 transition-colors">
                  About MediaForge
                </Link>
              </li>

            </ul>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface dark:text-slate-200 mb-3">
              Compliance & Legal
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/terms" className="hover:text-primary dark:hover:text-violet-300 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-primary dark:hover:text-violet-300 transition-colors">
                  Privacy Policy & Data Security
                </Link>
              </li>

            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between text-xs text-on-surface-variant dark:text-slate-200">
          <p>© {new Date().getFullYear()} MediaForge.</p>

        </div>
      </div>
    </footer>
  );
}

