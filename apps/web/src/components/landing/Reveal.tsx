import React from "react";
import { useReveal } from "./useReveal";

interface RevealProps extends React.HTMLAttributes<HTMLDivElement> {
  delay?: number;
  as?: "div" | "section";
}

/** Wrapper that fades/slides its children in on scroll. */
export const Reveal: React.FC<RevealProps> = ({
  children,
  className = "",
  delay = 0,
  as = "div",
  ...rest
}) => {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const Tag = as as any;

  return (
    <Tag
      ref={ref}
      className={`reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : undefined }}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export default Reveal;
