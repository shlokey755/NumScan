// Project folders that group scans by subject or experiment. The user picks one folder once.
// Each project is a subfolder of it, so the files can be seen in the phone's Files app.
// On Android the folder is a Storage Access Framework (SAF) tree; on iPhone it is a folder
// in the Files app. The native module is required inside each function, so it is loaded
// only when that feature runs.
//
// Rule for SAF folders: never build a child's address by joining its name onto the folder's
// address (new File(folder, name) or new Directory(folder, name)). Paths.join only appends text,
// so on Android the result is not a document address for the child. Read from expo-file-system's
// source (not run on a device), the library may resolve it to the save folder itself, so exists
// could be true for a missing project and delete() could remove the whole save folder.
// Children are always found with list(), or made with createFile() and createDirectory(),
// which return the child's own address.
import { missingBuild } from './nativeError';
import { sanitizeName } from './zipPack';
import {
  ROOT_FILE_NAME,
  isPlainName,
  mimeFor,
  parseStoredRoot,
  storedRootText,
  takenNames,
  uniqueFileName,
} from './projectRoot';

// Bytes copied per step when a file is copied in. Small steps keep memory low for large videos.
const CHUNK_BYTES = 1024 * 1024;
// Copies made for sharing go in this cache folder. The system clears it when space runs low.
const SHARE_FOLDER = 'numscan-share';

const CHOOSE_MESSAGE = 'Choose a save folder first. Projects are saved there, so you can see them in the Files app.';
const LOST_MESSAGE = 'NumScan can no longer open the save folder. Choose it again.';

function fileSystem() {
  try {
    return require('expo-file-system');
  } catch (cause) {
    throw missingBuild(cause);
  }
}

// An error with a code the screen can read: 'NO_FOLDER' or 'FOLDER_LOST'.
function folderError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

// True when the picker was closed without a choice. Android and iPhone name it differently.
function isCancel(error) {
  return /cancel/i.test(`${error?.code ?? ''} ${error?.message ?? ''}`);
}

// The saved folder address as { uri, name }, or null. Never throws: a missing or damaged
// file means no folder has been chosen yet.
function readStoredRoot(FileSystem) {
  try {
    const file = new FileSystem.File(FileSystem.Paths.document, ROOT_FILE_NAME);
    return file.exists ? parseStoredRoot(file.textSync()) : null;
  } catch (error) {
    console.warn('Save folder setting could not be read:', error);
    return null;
  }
}

// Opens the save folder and lists it, so a lost permission shows up here.
// Throws a 'NO_FOLDER' or 'FOLDER_LOST' error otherwise.
function openSaveFolder(FileSystem) {
  const stored = readStoredRoot(FileSystem);
  if (!stored) throw folderError('NO_FOLDER', CHOOSE_MESSAGE);
  try {
    const folder = new FileSystem.Directory(stored.uri);
    if (folder.exists) {
      folder.list();
      return folder;
    }
  } catch (error) {
    console.warn('Save folder could not be opened:', error);
  }
  throw folderError('FOLDER_LOST', LOST_MESSAGE);
}

// The project folder with this name. Found with list(), never by joining the name onto the path.
function projectFolder(FileSystem, name) {
  const folder = openSaveFolder(FileSystem)
    .list()
    .find((entry) => entry instanceof FileSystem.Directory && entry.name === name);
  if (!folder) throw new Error('That project no longer exists.');
  return folder;
}

// A file inside a project, found with list().
function projectFile(FileSystem, project, fileName) {
  const file = projectFolder(FileSystem, project)
    .list()
    .find((entry) => entry instanceof FileSystem.File && entry.name === fileName);
  if (!file) throw new Error('That file no longer exists.');
  return file;
}

// The state of the save folder, for the screen. state is 'none', 'lost' or 'ready'.
export function saveFolderStatus() {
  const FileSystem = fileSystem();
  const stored = readStoredRoot(FileSystem);
  if (!stored) return { state: 'none', name: '' };
  try {
    openSaveFolder(FileSystem);
    return { state: 'ready', name: stored.name };
  } catch (error) {
    return { state: 'lost', name: stored.name };
  }
}

// Asks the user to pick a folder and remembers it. Resolves to the folder's name, or null when
// the user closed the picker without choosing. On Android the library takes a persistable
// permission for the folder, so access should last across restarts (not run on a device). The
// library's typings say iPhone access lasts only for the current run of the app, so the user
// may be asked to choose again after a restart.
export async function chooseSaveFolder() {
  const FileSystem = fileSystem();
  let folder;
  try {
    folder = await FileSystem.Directory.pickDirectoryAsync();
  } catch (error) {
    if (isCancel(error)) return null;
    throw error;
  }
  try {
    folder.list();
  } catch (error) {
    console.warn('Chosen folder could not be read:', error);
    throw new Error('NumScan cannot read that folder. Choose a different folder.');
  }
  const name = folder.name;
  try {
    new FileSystem.File(FileSystem.Paths.document, ROOT_FILE_NAME).write(
      storedRootText({ uri: folder.uri, name })
    );
  } catch (error) {
    console.warn('Save folder setting could not be written:', error);
    throw new Error('NumScan could not save the folder choice. Try again.');
  }
  return name;
}

// [{ name, fileCount }], sorted by name.
export function listProjects() {
  const FileSystem = fileSystem();
  return openSaveFolder(FileSystem)
    .list()
    .filter((entry) => entry instanceof FileSystem.Directory)
    .map((folder) => ({
      name: folder.name,
      fileCount: folder.list().filter((entry) => entry instanceof FileSystem.File).length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Creates a project and returns its name. Refuses an empty name, or one already in use (ignoring case).
export function createProject(name) {
  const FileSystem = fileSystem();
  const label = String(name ?? '').trim();
  if (!label) throw new Error('Type a name for the project.');
  const folderName = sanitizeName(label);
  if (!isPlainName(folderName)) throw new Error('That name is not allowed.');

  const root = openSaveFolder(FileSystem);
  const taken = takenNames(root.list().map((entry) => entry.name));
  if (taken.has(folderName.toLowerCase())) throw new Error('A project with that name already exists.');
  return root.createDirectory(folderName).name;
}

// [{ name, size }] for the files in a project, sorted by name.
export function listFiles(project) {
  const FileSystem = fileSystem();
  return projectFolder(FileSystem, project)
    .list()
    .filter((entry) => entry instanceof FileSystem.File)
    .map((file) => ({ name: file.name, size: file.size }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Copies bytes from one file into another in steps. Yields to the UI between steps, so a large
// copy does not freeze the screen.
async function copyBytes(FileSystem, source, target) {
  const reader = source.open(FileSystem.FileMode.ReadOnly);
  let writer = null;
  try {
    writer = target.open(FileSystem.FileMode.WriteOnly);
    for (let chunk = reader.readBytes(CHUNK_BYTES); chunk.length > 0; chunk = reader.readBytes(CHUNK_BYTES)) {
      writer.writeBytes(chunk);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  } finally {
    reader.close();
    writer?.close();
  }
}

// Copies picked files into a project, keeping their names. A name already in the project gets
// a number, so nothing is overwritten. Returns the names as saved.
export async function importFiles(project, items) {
  const FileSystem = fileSystem();
  const folder = projectFolder(FileSystem, project);
  const taken = takenNames(folder.list().map((entry) => entry.name));
  const saved = [];
  for (const item of items) {
    const name = uniqueFileName(sanitizeName(item.name), taken);
    // createFile returns the right address on every platform, including SAF.
    const target = folder.createFile(name, mimeFor(name));
    try {
      await copyBytes(FileSystem, new FileSystem.File(item.uri), target);
    } catch (error) {
      try {
        target.delete();
      } catch (cleanupError) {
        console.warn('Partial copy could not be removed:', cleanupError);
      }
      throw error;
    }
    saved.push(target.name);
  }
  return saved;
}

// Copies one project file into the app's cache and returns its file:// address, ready to share.
// The Android share sheet accepts only file:// addresses, not content:// (SAF) addresses.
export async function copyFileForShare(project, fileName) {
  const FileSystem = fileSystem();
  const source = projectFile(FileSystem, project, fileName);
  const folder = new FileSystem.Directory(FileSystem.Paths.cache, SHARE_FOLDER);
  folder.create({ intermediates: true, idempotent: true });
  const staged = new FileSystem.File(folder, sanitizeName(fileName));
  if (staged.exists) staged.delete();
  await source.copy(staged);
  return staged.uri;
}

export function deleteFile(project, fileName) {
  const FileSystem = fileSystem();
  projectFile(FileSystem, project, fileName).delete();
}

// Removes a project and every file in it.
export function deleteProject(name) {
  const FileSystem = fileSystem();
  projectFolder(FileSystem, name).delete();
}
