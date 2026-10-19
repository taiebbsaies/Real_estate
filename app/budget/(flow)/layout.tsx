export default function FlowLayout({ children }: LayoutProps<"/budget">) {
  return <div className="flex flex-1 flex-col">{children}</div>;
}
