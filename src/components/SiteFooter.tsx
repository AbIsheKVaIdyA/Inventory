export function SiteFooter() {
  return (
    <footer
      role="contentinfo"
      className="fixed bottom-0 left-0 right-0 z-[32] rounded-t-xl border-t border-border/60 bg-background/92 px-3 pb-[env(safe-area-inset-bottom,0px)] pt-1.5 text-center backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-[0_-8px_24px_rgba(0,0,0,0.35)]"
    >
      <p className="text-[0.625rem] leading-snug tracking-wide text-muted-foreground">
        &copy; 2026 Abhishek Vaidya for ECS IT Operations
      </p>
    </footer>
  );
}
