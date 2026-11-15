import api, { getAssetUrl } from '../api/axios';

/**
 * In-Browser Client-Side Video Compressor & Upload Utility
 * Uses HTML5 Canvas, Web Audio API, and MediaRecorder to transcode & compress
 * large video files down to 720p/1080p with optimized bitrates before uploading.
 */

export const getSupportedVideoMimeType = () => {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4'
  ];

  for (const type of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return 'video/webm';
};

export const compressVideo = async (file, {
  maxHeight = 720,
  videoBitrate = 1800000, // 1.8 Mbps
  audioBitrate = 128000,  // 128 kbps
  onProgress = () => {}
} = {}) => {
  return new Promise((resolve, reject) => {
    // If MediaRecorder or Canvas is not available, return original
    if (typeof MediaRecorder === 'undefined' || typeof document === 'undefined') {
      console.warn('MediaRecorder not supported, using original video file.');
      return resolve({
        compressedFile: file,
        originalSize: file.size,
        compressedSize: file.size,
        savingsPercent: 0,
        skipped: true
      });
    }

    const videoUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = videoUrl;
    video.muted = false; // Need audio routed through AudioContext
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    let audioContext = null;
    let sourceNode = null;
    let destinationNode = null;
    let mediaRecorder = null;
    let animationFrameId = null;
    let isCleanedUp = false;

    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
      }
      URL.revokeObjectURL(videoUrl);
    };

    video.onerror = (err) => {
      cleanup();
      console.warn('Error loading video for compression, falling back to original file:', err);
      resolve({
        compressedFile: file,
        originalSize: file.size,
        compressedSize: file.size,
        savingsPercent: 0,
        skipped: true
      });
    };

    video.onloadedmetadata = async () => {
      try {
        const originalWidth = video.videoWidth || 1280;
        const originalHeight = video.videoHeight || 720;
        const duration = video.duration || 1;

        // Calculate aspect-ratio preserved dimensions capped at maxHeight
        let targetWidth = originalWidth;
        let targetHeight = originalHeight;

        if (originalHeight > maxHeight) {
          const scale = maxHeight / originalHeight;
          targetHeight = maxHeight;
          targetWidth = Math.round(originalWidth * scale);
        }

        // Canvas dimensions must be even numbers for codecs
        targetWidth = targetWidth % 2 === 0 ? targetWidth : targetWidth + 1;
        targetHeight = targetHeight % 2 === 0 ? targetHeight : targetHeight + 1;

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d', { alpha: false });

        // Setup Audio Capture
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioCtx();
        sourceNode = audioContext.createMediaElementSource(video);
        destinationNode = audioContext.createMediaStreamDestination();
        sourceNode.connect(destinationNode);

        // Silent monitor so audio plays through element without blasting speakers
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0;
        sourceNode.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Combine Canvas stream (30 FPS) + Audio stream
        const canvasStream = canvas.captureStream(30);
        const combinedStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...destinationNode.stream.getAudioTracks()
        ]);

        const mimeType = getSupportedVideoMimeType();
        mediaRecorder = new MediaRecorder(combinedStream, {
          mimeType,
          videoBitsPerSecond: videoBitrate,
          audioBitsPerSecond: audioBitrate
        });

        const recordedChunks = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunks.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          cleanup();
          const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
          const originalNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
          const compressedBlob = new Blob(recordedChunks, { type: mimeType });
          const compressedFile = new File(
            [compressedBlob], 
            `${originalNameWithoutExt}_compressed.${extension}`, 
            { type: mimeType }
          );

          const originalSize = file.size;
          const compressedSize = compressedFile.size;
          const savingsPercent = originalSize > compressedSize 
            ? Math.round(((originalSize - compressedSize) / originalSize) * 100) 
            : 0;

          // If compressed is somehow larger than original, return original
          if (compressedSize >= originalSize) {
            return resolve({
              compressedFile: file,
              originalSize,
              compressedSize: originalSize,
              savingsPercent: 0,
              skipped: true
            });
          }

          resolve({
            compressedFile,
            originalSize,
            compressedSize,
            savingsPercent,
            skipped: false
          });
        };

        // Render loop
        const drawFrame = () => {
          if (video.paused || video.ended || isCleanedUp) return;
          ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
          
          if (duration > 0) {
            const pct = Math.min(Math.round((video.currentTime / duration) * 100), 99);
            onProgress(pct);
          }
          animationFrameId = requestAnimationFrame(drawFrame);
        };

        // Accelerated playback speed for faster compression (2x speed)
        video.playbackRate = 2.0;

        video.onended = () => {
          onProgress(100);
          if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        };

        mediaRecorder.start(1000); // 1-second chunks
        await video.play();
        drawFrame();

      } catch (err) {
        cleanup();
        console.warn('Compression failed, falling back to original:', err);
        resolve({
          compressedFile: file,
          originalSize: file.size,
          compressedSize: file.size,
          savingsPercent: 0,
          skipped: true
        });
      }
    };
  });
};

/**
 * Upload video through authenticated HRMS PHP API, preserving progress.
 */
export const uploadToSupabaseWithProgress = async ({
  bucket, fileName, fileBlob, onProgress = () => {}
}) => {
  const startedAt = Date.now();
  const response = await api.post('/storage/upload', fileBlob, {
    params: { bucket, path: fileName },
    headers: { 'Content-Type': fileBlob.type || 'application/octet-stream' },
    onUploadProgress: ({ loaded, total }) => {
      const size = total || fileBlob.size;
      const elapsed = Math.max((Date.now() - startedAt) / 1000, 0.01);
      onProgress({
        loaded, total: size,
        percent: Math.min(100, Math.round(loaded * 100 / size)),
        speedMBps: (loaded / elapsed / (1024 * 1024)).toFixed(1)
      });
    }
  });
  return { ...response.data, publicUrl: getAssetUrl('/Training-Video/' + response.data.path) };
};

export const formatBytes = (bytes, decimals = 1) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};
