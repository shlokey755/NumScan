// Shown when a feature needs a native module that this build does not include.
// Only the feature fails. The rest of the app keeps working.
const REBUILD_MESSAGE =
  'This build of NumScan does not include this yet. Build a new development build to turn it on.';

export function missingBuild(cause) {
  const error = new Error(REBUILD_MESSAGE);
  error.cause = cause;
  return error;
}
