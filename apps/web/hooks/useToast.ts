"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SHOW_MS = 1600;

export function useToast(): { message: string; visible: boolean; show: (text: string) => void } {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((text: string): void => {
    setMessage(text);
    setVisible(true);
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => setVisible(false), SHOW_MS);
  }, []);

  useEffect(() => () => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
  }, []);

  return { message, visible, show };
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
