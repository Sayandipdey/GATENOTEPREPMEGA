"use client";

import { useState } from "react";
import { getMegaEmbedUrl } from "@/lib/mega-validate";
import { Button } from "@/components/ui/Button";

interface MegaEmbedProps {
  megaLink: string;
  title: string;
}

export function MegaEmbed({ megaLink, title }: MegaEmbedProps) {
  const [iframeError, setIframeError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const embedUrl = getMegaEmbedUrl(megaLink);

  const handleOpenExternal = () => {
    window.open(megaLink, "_blank", "noopener,noreferrer");
  };

  if (!embedUrl || iframeError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-900 border border-gray-800 rounded-xl text-center gap-3">
        <p className="text-sm text-gray-300">
          This note is hosted directly on MEGA cloud storage.
        </p>
        <Button onClick={handleOpenExternal} variant="primary">
          Open in MEGA ↗
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="relative w-full aspect-[4/3] md:aspect-[16/9] bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-gray-400 text-sm">
            Loading MEGA preview...
          </div>
        )}
        <iframe
          src={embedUrl}
          title={`Preview of ${title}`}
          className="w-full h-full border-0"
          allowFullScreen
          onLoad={() => setIsLoading(false)}
          onError={() => setIframeError(true)}
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={handleOpenExternal} variant="ghost" size="sm">
          Open in MEGA new tab ↗
        </Button>
      </div>
    </div>
  );
}
