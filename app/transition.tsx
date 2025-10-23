"use client";

import { motion } from "framer-motion";

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      transition={{ type: "decay" }}
      className="h-full w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {children}
    </motion.div>
  );
}
