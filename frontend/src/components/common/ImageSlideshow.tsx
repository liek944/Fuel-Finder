/**
 * Image Slideshow Component
 * Displays a carousel of images with navigation controls
 */

import React, { useState } from "react";

interface ImageSlideshowProps {
  images: Array<{
    id: number;
    filename: string;
    original_filename: string;
    url: string;
    thumbnailUrl: string;
    alt_text?: string;
  }>;
}

const ImageSlideshow: React.FC<ImageSlideshowProps> = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) return null;

  const currentImage = images[currentIndex];

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent event from bubbling to parent components
    setCurrentIndex((currentIndex + 1) % images.length);
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent event from bubbling to parent components
    setCurrentIndex((currentIndex - 1 + images.length) % images.length);
  };

  return (
    <div>
      <div style={{ position: "relative", minHeight: 150 }}>
        <img
          src={currentImage.url}
          alt={currentImage.alt_text || currentImage.original_filename}
          style={{
            width: "100%",
            height: 150,
            objectFit: "cover",
            borderRadius: 8,
            cursor: images.length > 1 ? "pointer" : "default",
          }}
          onClick={images.length > 1 ? (e) => nextImage(e) : undefined}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = "https://via.placeholder.com/150?text=Image+Not+Found";
          }}
        />
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => prevImage(e)}
              style={{
                position: "absolute",
                left: 4,
                top: "50%",
                transform: "translateY(-50%)",
                background: "rgba(0,0,0,0.5)",
                color: "white",
                border: "none",
                borderRadius: "50%",
                width: 30,
                height: 30,
                cursor: "pointer",
                fontSize: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ‹
            </button>
            <button
              onClick={(e) => nextImage(e)}
              style={{
                position: "absolute",
                right: 4,
                top: "50%",
                transform: "translateY(-50%)",
                background: "rgba(0,0,0,0.5)",
                color: "white",
                border: "none",
                borderRadius: "50%",
                width: 30,
                height: 30,
                cursor: "pointer",
                fontSize: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ›
            </button>
            <div
              style={{
                position: "absolute",
                bottom: 4,
                right: 4,
                background: "rgba(0,0,0,0.7)",
                color: "white",
                padding: "2px 6px",
                borderRadius: 12,
                fontSize: 11,
              }}
            >
              {currentIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: 2,
            justifyContent: "center",
            marginTop: 4,
          }}
        >
          {images.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                border: "none",
                background: index === currentIndex ? "#3b82f6" : "#d1d5db",
                cursor: "pointer",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageSlideshow;
