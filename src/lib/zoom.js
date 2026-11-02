// Pure zoom maths, with no React Native imports, so it can be tested in plain Node.
//
// expo-camera's `zoom` prop is a fraction of the phone's maximum zoom:
// 0 = no zoom, 1 = the most the hardware allows. The slider uses the same scale.

export const TRACK_LENGTH = 200; // px, full height of the slider
export const THUMB_SIZE = 20; // px, square thumb
export const TRAVEL = TRACK_LENGTH - THUMB_SIZE; // px the thumb can move

export function clampZoom(zoom) {
  return Math.min(1, Math.max(0, zoom));
}

// dy is how far the finger has moved since the drag started. Moving up is negative
// and zooms in, so the change is subtracted.
export function zoomFromDrag(startZoom, dy) {
  return clampZoom(startZoom - dy / TRAVEL);
}

// Distance from the top of the track to the thumb's top edge.
// Zoom 0 puts the thumb at the bottom; zoom 1 puts it at the top.
export function thumbTop(zoom) {
  return (1 - clampZoom(zoom)) * TRAVEL;
}

// Where the filled part of the rail starts, measured from the top of the track.
// It runs from the thumb's centre down to the bottom of the track.
export function fillTop(zoom) {
  return thumbTop(zoom) + THUMB_SIZE / 2;
}
