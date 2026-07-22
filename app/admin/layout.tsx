export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-[1040px] flex-col gap-6 px-4 py-8">
      <header className="border-b border-sable/40 pb-4">
        <p className="font-mono text-sm text-encre/70">Admin</p>
      </header>
      {children}
    </div>
  );
}
