// Local project folders that group scans by subject or experiment. Each project is a folder
// in the app's private storage, so nothing leaves the phone. The native module is required
// inside each function, so it is loaded only when that feature runs.
import { missingBuild } from './nativeError';
import { sanitizeName } from './zipPack';

const ROOT_NAME = 'NumScanProjects';

function fileSystem() {
  try {
    return require('expo-file-system');
  } catch (cause) {
    throw missingBuild(cause);
  }
}

// The folder that holds every project. It may not exist yet.
function rootFolder(FileSystem) {
  return new FileSystem.Directory(FileSystem.Paths.document, ROOT_NAME);
}

// A plain name only. Blocks '..', '.' and anything with a slash, so a name cannot reach outside the project.
function plainName(name) {
  if (typeof name !== 'string' || sanitizeName(name) !== name || /^\.+$/.test(name)) {
    throw new Error('That name is not allowed.');
  }
  return name;
}

// Returns the project folder, or throws if it is not there.
function existingProject(FileSystem, name) {
  const folder = new FileSystem.Directory(rootFolder(FileSystem), plainName(name));
  if (!folder.exists) throw new Error('That project no longer exists.');
  return folder;
}

// Returns the name, or 'scan (2).pdf', 'scan (3).pdf'... when the name is already in the folder.
function uniqueFileName(FileSystem, folder, name) {
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let candidate = name;
  for (let n = 2; new FileSystem.File(folder, candidate).exists; n += 1) {
    candidate = `${stem} (${n})${ext}`;
  }
  return candidate;
}

// [{ name, fileCount }], sorted by name.
export function listProjects() {
  const FileSystem = fileSystem();
  const root = rootFolder(FileSystem);
  if (!root.exists) return [];
  return root
    .list()
    .filter((entry) => entry instanceof FileSystem.Directory)
    .map((folder) => ({
      name: folder.name,
      fileCount: folder.list().filter((entry) => entry instanceof FileSystem.File).length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Creates a project and returns its name. Refuses an empty name or one already in use, ignoring case.
export function createProject(name) {
  const FileSystem = fileSystem();
  const label = String(name ?? '').trim();
  if (!label) throw new Error('Type a name for the project.');
  const folderName = plainName(sanitizeName(label));

  const taken = listProjects().some((p) => p.name.toLowerCase() === folderName.toLowerCase());
  if (taken) throw new Error('A project with that name already exists.');

  const root = rootFolder(FileSystem);
  if (!root.exists) root.create({ intermediates: true });
  new FileSystem.Directory(root, folderName).create({ intermediates: true });
  return folderName;
}

// [{ name, size }] for the files in a project, sorted by name.
export function listFiles(project) {
  const FileSystem = fileSystem();
  return existingProject(FileSystem, project)
    .list()
    .filter((entry) => entry instanceof FileSystem.File)
    .map((file) => ({ name: file.name, size: file.size }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Copies picked files into a project, keeping their names. Returns the names saved.
export async function importFiles(project, items) {
  const FileSystem = fileSystem();
  const folder = existingProject(FileSystem, project);
  const saved = [];
  for (const item of items) {
    const name = uniqueFileName(FileSystem, folder, sanitizeName(item.name));
    await new FileSystem.File(item.uri).copy(new FileSystem.File(folder, name));
    saved.push(name);
  }
  return saved;
}

// The file:// address of one file in a project. Used when sharing it.
export function projectFileUri(project, fileName) {
  const FileSystem = fileSystem();
  return new FileSystem.File(existingProject(FileSystem, project), plainName(fileName)).uri;
}

export function deleteFile(project, fileName) {
  const FileSystem = fileSystem();
  new FileSystem.File(existingProject(FileSystem, project), plainName(fileName)).delete();
}

// Removes a project and every file in it.
export function deleteProject(name) {
  const FileSystem = fileSystem();
  existingProject(FileSystem, name).delete();
}
