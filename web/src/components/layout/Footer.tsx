import Link from "next/link";
import { Sparkles, Github, Shield, Terminal, BookOpen, Heart } from "lucide-react";
import { SWAGGER_DOCS_URL } from "@/config/api";

export function Footer() {
  return (
    <footer className="border-t border-outline-variant/30 bg-surface-container-lowest/80 dark:bg-slate-950/80 backdrop-blur-xl text-on-surface-variant text-sm transition-colors mt-auto">
      <div className="max-w-7xl mx-auto px-gutter py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-on-surface dark:text-white">MediaForge</span>
              <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant text-[11px] font-semibold uppercase tracking-wider">
                Pro
              </span>
            </Link>
            <p className="text-xs leading-relaxed text-on-surface-variant">
              Precision media processing suite combining authorized stream extraction with versatile client and offline media transcoding.
            </p>
            <div className="flex items-center space-x-3 text-xs text-on-surface-variant">
              <span className="inline-flex items-center space-x-1">
                <Shield className="w-3.5 h-3.5 text-tertiary" />
                <span>SSRF Protected</span>
              </span>
              <span>•</span>
              <span className="inline-flex items-center space-x-1">
                <Terminal className="w-3.5 h-3.5 text-primary" />
                <span>REST API v1</span>
              </span>
            </div>
          </div>

          {/* Tools */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface dark:text-slate-200 mb-3">
              Media Processing
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/downloader" className="hover:text-primary transition-colors">
                  Media Downloader
                </Link>
              </li>
              <li>
                <Link href="/converter/video" className="hover:text-primary transition-colors">
                  Video Editor
                </Link>
              </li>
              <li>
                <Link href="/converter/audio" className="hover:text-primary transition-colors">
                  Audio Editor
                </Link>
              </li>
              <li>
                <Link href="/converter/image" className="hover:text-primary transition-colors">
                  Image Editor
                </Link>
              </li>
              <li>
                <Link href="/converter/batch" className="hover:text-primary transition-colors">
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
                <Link href="/formats" className="hover:text-primary transition-colors">
                  Supported Formats Catalog
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-primary transition-colors">
                  About MediaForge
                </Link>
              </li>
              <li>
                <a
                  href={SWAGGER_DOCS_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1 hover:text-primary transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Swagger / OpenAPI UI</span>
                </a>
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
                <Link href="/terms" className="hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-primary transition-colors">
                  Privacy Policy & Data Security
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/rusiru-242/mediaforge"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1.5 hover:text-on-surface dark:hover:text-white transition-colors"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>GitHub Repository</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between text-xs text-on-surface-variant">
          <p>© {new Date().getFullYear()} MediaForge Pro. Powered by WebAssembly, FFmpeg & Spring Boot.</p>
          <p className="flex items-center space-x-1 mt-2 sm:mt-0 font-metric-tabular">
            <span>Next.js 15 · TypeScript · Tailwind CSS</span>
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

