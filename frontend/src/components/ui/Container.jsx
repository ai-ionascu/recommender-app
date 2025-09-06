export default function Container({ children, className = "" }) {
  return <div className={`mx-auto max-w-7xl px-4 ${className}`}>{children}</div>;
}
