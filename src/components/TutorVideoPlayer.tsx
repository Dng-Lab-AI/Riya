import type { VideoView } from "@/lib/tutor-video";

// Plays a tutor's presentation video: a file stored on Riya, or a YouTube embed.
export function TutorVideoPlayer({ video, title, className = "" }: { video: NonNullable<VideoView>; title: string; className?: string }) {
  return (
    <div className={`relative aspect-video overflow-hidden rounded-[1.25rem] bg-earth-900 ${className}`}>
      {video.kind === "upload" ? (
        <video src={video.url} controls preload="metadata" playsInline className="h-full w-full object-contain" aria-label={title} />
      ) : (
        <iframe
          src={video.embed}
          title={title}
          className="h-full w-full"
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      )}
    </div>
  );
}
