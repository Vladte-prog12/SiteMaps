import { motion } from "framer-motion";
import React from "react";

const pageVariants = {
  initial: {
    opacity: 0,
    x: -100,
    scale: 0.8,
  },
  in: {
    opacity: 1,
    x: 0,
    scale: 1,
  },
  out: {
    opacity: 0,
    x: 100,
    scale: 0.8,
  },
};

const pageTransition = {
  type: "spring",
  stiffness: 100,
  damping: 20,
  mass: 1,
};

const PageTransition = ({ children, animationType = "default" }) => {
  const getAnimationVariants = () => {
    switch (animationType) {
      case "fade":
        return {
          initial: { 
            opacity: 0,
            scale: 0.95,
            filter: "blur(10px)"
          },
          in: { 
            opacity: 1,
            scale: 1,
            filter: "blur(0px)"
          },
          out: { 
            opacity: 0,
            scale: 1.05,
            filter: "blur(10px)"
          },
        };
      case "cube":
        return {
          initial: { 
            opacity: 0,
            rotateX: 90,
            rotateY: 90,
            scale: 0.5
          },
          in: { 
            opacity: 1,
            rotateX: 0,
            rotateY: 0,
            scale: 1
          },
          out: { 
            opacity: 0,
            rotateX: -90,
            rotateY: -90,
            scale: 0.5
          },
        };
      case "spiral":
        return {
          initial: { 
            opacity: 0,
            scale: 0,
            rotate: -180
          },
          in: { 
            opacity: 1,
            scale: 1,
            rotate: 0
          },
          out: { 
            opacity: 0,
            scale: 0,
            rotate: 180
          },
        };
      case "fold":
        return {
          initial: { 
            opacity: 0,
            scaleY: 0,
            scaleX: 0.5,
            rotateX: 90
          },
          in: { 
            opacity: 1,
            scaleY: 1,
            scaleX: 1,
            rotateX: 0
          },
          out: { 
            opacity: 0,
            scaleY: 0,
            scaleX: 0.5,
            rotateX: -90
          },
        };
      case "swing":
        return {
          initial: { 
            opacity: 0,
            rotateZ: -45,
            y: -100,
            scale: 0.5
          },
          in: { 
            opacity: 1,
            rotateZ: 0,
            y: 0,
            scale: 1
          },
          out: { 
            opacity: 0,
            rotateZ: 45,
            y: 100,
            scale: 0.5
          },
        };
      case "flip3d":
        return {
          initial: { 
            opacity: 0,
            rotateX: 90,
            scale: 0.8
          },
          in: { 
            opacity: 1,
            rotateX: 0,
            scale: 1
          },
          out: { 
            opacity: 0,
            rotateX: -90,
            scale: 0.8
          },
        };
      case "expand":
        return {
          initial: { 
            opacity: 0,
            scale: 0.2,
            rotate: 45,
            y: 100
          },
          in: { 
            opacity: 1,
            scale: 1,
            rotate: 0,
            y: 0
          },
          out: { 
            opacity: 0,
            scale: 1.8,
            rotate: -45,
            y: -100
          },
        };
      case "door":
        return {
          initial: { 
            opacity: 0,
            rotateY: 90,
            scale: 0.8,
            x: -100
          },
          in: { 
            opacity: 1,
            rotateY: 0,
            scale: 1,
            x: 0
          },
          out: { 
            opacity: 0,
            rotateY: -90,
            scale: 0.8,
            x: 100
          },
        };
      default:
        return pageVariants;
    }
  };

  const getTransition = () => {
    switch (animationType) {
      case "fade":
        return {
          type: "spring",
          stiffness: 50,
          damping: 15,
          mass: 1
        };
      case "cube":
        return {
          type: "spring",
          stiffness: 70,
          damping: 20,
          mass: 1
        };
      case "spiral":
        return {
          type: "spring",
          stiffness: 100,
          damping: 15,
          mass: 1
        };
      case "fold":
        return {
          type: "spring",
          stiffness: 80,
          damping: 18,
          mass: 1
        };
      case "swing":
        return {
          type: "spring",
          stiffness: 90,
          damping: 12,
          mass: 1
        };
      case "flip3d":
        return {
          type: "spring",
          stiffness: 85,
          damping: 20,
          mass: 1
        };
      case "expand":
        return {
          type: "spring",
          stiffness: 110,
          damping: 15,
          mass: 1
        };
      case "door":
        return {
          type: "spring",
          stiffness: 75,
          damping: 17,
          mass: 1
        };
      default:
        return pageTransition;
    }
  };

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={getAnimationVariants()}
      transition={getTransition()}
      style={{
        perspective: "1000px",
        transformStyle: "preserve-3d"
      }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition; 