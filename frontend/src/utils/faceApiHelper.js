import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;

export const loadModels = async () => {
  if (modelsLoaded) return;
  
  const MODEL_URL = '/models';

  // We use tinyFaceDetector for extreme performance
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
  ]);

  modelsLoaded = true;
};

export const getFaceDescriptor = async (videoEl) => {
  if (!modelsLoaded) {
    throw new Error('Models not loaded yet');
  }

  // Use TinyFaceDetectorOptions for max speed
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
  
  const detection = await faceapi.detectSingleFace(videoEl, options)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) return null;

  // return the Float32Array as a normal array for JSON stringification
  return Array.from(detection.descriptor);
};

/**
 * Validates whether the detected face is fully centered and appropriately sized within the framing circle
 */
export const detectAndValidateFace = async (videoEl) => {
  if (!modelsLoaded) {
    throw new Error('Models not loaded yet');
  }

  if (!videoEl || videoEl.readyState !== 4) {
    return { isAligned: false, reason: 'Camera initializing...', descriptor: null };
  }

  const videoWidth = videoEl.videoWidth || 640;
  const videoHeight = videoEl.videoHeight || 480;

  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
  const detection = await faceapi.detectSingleFace(videoEl, options)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    return { isAligned: false, reason: 'No face detected. Position face in circle.', descriptor: null };
  }

  const { box } = detection.detection;
  const faceCenterX = box.x + box.width / 2;
  const faceCenterY = box.y + box.height / 2;

  // Normalized distance from center of video
  const dx = Math.abs(faceCenterX - videoWidth / 2) / videoWidth;
  const dy = Math.abs(faceCenterY - videoHeight / 2) / videoHeight;
  const widthRatio = box.width / videoWidth;
  const heightRatio = box.height / videoHeight;

  // 1. Center check: Face center must be reasonably close to video center
  if (dx > 0.15 || dy > 0.18) {
    return { isAligned: false, reason: 'Move face to center of circle', descriptor: null };
  }

  // 2. Size check: Not too far away
  if (widthRatio < 0.20 || heightRatio < 0.24) {
    return { isAligned: false, reason: 'Move closer to camera', descriptor: null };
  }

  // 3. Size check: Not too close / cut off
  if (widthRatio > 0.68 || heightRatio > 0.75) {
    return { isAligned: false, reason: 'Move slightly back from camera', descriptor: null };
  }

  // 4. Edge containment check: Face boundaries must not be cut off at edges
  const margin = 12;
  if (
    box.x < margin || 
    box.y < margin || 
    (box.x + box.width) > (videoWidth - margin) || 
    (box.y + box.height) > (videoHeight - margin)
  ) {
    return { isAligned: false, reason: 'Face is cut off at the edge. Align inside circle.', descriptor: null };
  }

  return {
    isAligned: true,
    reason: 'Face aligned in circle! Ready to capture.',
    descriptor: Array.from(detection.descriptor)
  };
};
