import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface MotionPageTransitionProps {
  children: ReactNode;
  className?: string;
  variant?: "fade" | "slide-up" | "slide-down" | "scale" | "slide-right";
  delay?: number;
}

const variants = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  "slide-up": {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  },
  "slide-down": {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 10 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
  },
  "slide-right": {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 10 },
  },
};

const MotionPageTransition = ({
  children,
  className,
  variant = "slide-up",
  delay = 0,
}: MotionPageTransitionProps) => {
  return (
    <motion.div
      initial={variants[variant].initial}
      animate={variants[variant].animate}
      exit={variants[variant].exit}
      transition={{
        duration: 0.25,
        ease: [0.4, 0, 0.2, 1],
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default MotionPageTransition;

// Staggered container for list animations
interface StaggeredMotionContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export const StaggeredMotionContainer = ({
  children,
  className,
  staggerDelay = 0.05,
}: StaggeredMotionContainerProps) => {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
};

// Individual staggered item
interface StaggeredItemProps {
  children: ReactNode;
  className?: string;
}

export const StaggeredItem = ({ children, className }: StaggeredItemProps) => {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.25,
            ease: [0.4, 0, 0.2, 1],
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
};

// Hover card animation wrapper
interface HoverCardAnimationProps {
  children: ReactNode;
  className?: string;
}

export const HoverCardAnimation = ({
  children,
  className,
}: HoverCardAnimationProps) => {
  return (
    <motion.div
      className={className}
      whileHover={{
        y: -4,
        transition: { duration: 0.2, ease: "easeOut" },
      }}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </motion.div>
  );
};

// Fade in on scroll
interface FadeInOnScrollProps {
  children: ReactNode;
  className?: string;
  threshold?: number;
}

export const FadeInOnScroll = ({
  children,
  className,
  threshold = 0.1,
}: FadeInOnScrollProps) => {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: threshold }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
};
