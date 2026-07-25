type PawMarkProps = {
  className?: string;
};

/** Brand mark: a plain animal paw silhouette (09-design.md forbids stock art
 *  and abstract geometry, so the only allowed figurative shape is an animal print). */
export function PawMark({ className }: PawMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="currentColor"
      aria-hidden
      focusable="false"
      className={className}
    >
      <ellipse cx="17.5" cy="24" rx="6" ry="8.2" transform="rotate(-20 17.5 24)" />
      <ellipse cx="29" cy="16.5" rx="6.2" ry="8.8" transform="rotate(-7 29 16.5)" />
      <ellipse cx="41.5" cy="18" rx="6.2" ry="8.6" transform="rotate(11 41.5 18)" />
      <ellipse cx="51.5" cy="28.5" rx="5.6" ry="7.6" transform="rotate(26 51.5 28.5)" />
      <path d="M32.5 30.5c8.9 0 16.6 6.8 18.6 13.6 2 6.9-2.9 12.1-9.8 12.1-3.9 0-6-1.9-8.8-1.9s-4.9 1.9-8.8 1.9c-6.9 0-11.8-5.2-9.8-12.1 2-6.8 9.7-13.6 18.6-13.6Z" />
    </svg>
  );
}
