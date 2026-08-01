export default function IconButton({
  label,
  children,
  className = '',
  type = 'button',
  ...props
}) {
  return <button
    {...props}
    type={type}
    className={`icon-button ${className}`.trim()}
    aria-label={label}
    title={label}
  >
    {children}
  </button>;
}
