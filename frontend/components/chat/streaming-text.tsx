'use client';

import { useEffect, useState } from 'react';

interface StreamingTextProps {
  content: string;
  speed?: number;
  onComplete?: () => void;
}

export function StreamingText({ content, speed = 20, onComplete }: StreamingTextProps) {
  const [displayed, setDisplayed] = useState('');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < content.length) {
      const timer = setTimeout(() => {
        setDisplayed((prev) => prev + content[index]);
        setIndex((prev) => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else {
      onComplete?.();
    }
  }, [content, index, speed, onComplete]);

  return (
    <span>
      {displayed}
      {index < content.length && (
        <span className="inline-block w-2 h-4 ml-0.5 bg-gray-400 animate-pulse" />
      )}
    </span>
  );
}
