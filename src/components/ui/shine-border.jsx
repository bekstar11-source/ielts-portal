import { cn } from "../../lib/utils";

/**
 * @name Shine Border
 * @description Animated shining border effect component.
 * @param borderRadius defines the radius of the border.
 * @param borderWidth defines the width of the border.
 * @param duration defines the animation duration in seconds.
 * @param color a string or string array to define border color.
 * @param className defines the class name to be applied to the component.
 * @param children contains react node elements.
 */
export function ShineBorder({
  borderRadius = 8,
  borderWidth = 1,
  duration = 14,
  color = "#000000",
  className,
  children,
}) {
  return (
    <div
      style={{ "--border-radius": `${borderRadius}px` }}
      className={cn(
        "relative w-full place-items-center rounded-[--border-radius] bg-white text-black",
        className,
      )}
    >
      <div
        style={{
          "--border-width": `${borderWidth}px`,
          "--border-radius": `${borderRadius}px`,
          "--duration": `${duration}s`,
          "--mask-linear-gradient": `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
          "--background-radial-gradient": `radial-gradient(transparent,transparent, ${Array.isArray(color) ? color.join(",") : color},transparent,transparent)`,
        }}
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[--border-radius]",
          "before:absolute before:inset-0 before:aspect-square before:size-full before:rounded-[--border-radius] before:p-[--border-width] before:will-change-[background-position] before:content-['']",
          "before:![-webkit-mask-composite:xor] before:![mask-composite:exclude]",
          "before:[background-image:--background-radial-gradient] before:[background-size:300%_300%] before:[mask:--mask-linear-gradient]",
          "motion-safe:before:animate-shine",
        )}
      />
      {children}
    </div>
  );
}
