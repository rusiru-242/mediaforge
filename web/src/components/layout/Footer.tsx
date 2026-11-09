import Link from "next/link";
import { Sparkles, Github, Shield, Terminal, BookOpen, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-navy-950/60 text-slate-600 dark:text-slate-400 text-sm transition-colors mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-violet-500 flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-white">MediaForge</span>
            </Link>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Universal media processing suite combining authorized media downloading with versatile online and offline media transcoding.
            </p>
            <div className="flex items-center space-x-3 text-xs text-slate-500">
              <span className="inline-flex items-center space-x-1">
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                <span>SSRF Protected</span>
              </span>
              <span>•</span>
              <span className="inline-flex items-center space-x-1">
                <Terminal className="w-3.5 h-3.5 text-brand-500" />
                <span>REST API v1</span>
              </span>
            </div>
          </div>

          {/* Tools */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-3">
              Media Processing
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/downloader" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  Media Downloader
                </Link>
              </li>
              <li>
                <Link href="/converter/video" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  Video Converter
                </Link>
              </li>
              <li>
                <Link href="/converter/audio" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  Audio Converter
                </Link>
              </li>
              <li>
                <Link href="/converter/image" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  Image Converter
                </Link>
              </li>
              <li>
                <Link href="/converter/batch" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  Batch Converter
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-3">
              Resources & Specs
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/formats" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  Supported Formats Catalog
                </Link>
              </li>
              <li>
                <Link href="/history" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  Conversion & Job History
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  About MediaForge
                </Link>
              </li>
              <li>
                <a
                  href="http://localhost:8080/swagger-ui.html"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Swagger / OpenAPI UI</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-3">
              Compliance & Legal
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/terms" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  Privacy Policy & Data Security
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/rusiru-242/mediaforge"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1.5 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>GitHub Repository</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} MediaForge. Open source under the MIT License.</p>
          <p className="flex items-center space-x-1 mt-2 sm:mt-0">
            <span>Built with Next.js, TypeScript & Tailwind CSS</span>
            <span>•</span>
            <span className="flex items-center">
              Made with <Heart className="w-3 h-3 text-rose-500 mx-1 fill-rose-500" /> by rusiru-242
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}

