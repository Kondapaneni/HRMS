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
