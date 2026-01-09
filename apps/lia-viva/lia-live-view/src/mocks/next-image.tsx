import React from 'react';

interface ImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  quality?: number;
  className?: string;
  style?: React.CSSProperties;
  sizes?: string;
  [key: string]: any;
}

export default function Image({ src, alt, className, style, fill, ...props }: ImageProps) {
  if (fill) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        style={{
          ...style,
          position: 'absolute',
          width: '100%',
          height: '100%',
          inset: 0,
          objectFit: 'cover',
        }}
        {...props}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      {...props}
    />
  );
}
