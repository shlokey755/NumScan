import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import ScreenHeader, { IconButton } from '../components/ScreenHeader';
import { colors } from '../theme';
import { pickAnyFiles } from '../lib/media';
import { shareFile } from '../lib/files';
import {
  createProject,
  deleteFile,
  deleteProject,
  importFiles,
  listFiles,
  listProjects,
  projectFileUri,
} from '../lib/projects';

const MIME = {
  pdf: 'application/pdf',
  txt: 'text/plain',
  csv: 'text/csv',
  json: 'application/json',
  html: 'text/html',
  htm: 'text/html',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  heic: 'image/heic',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  zip: 'application/zip',
};

// The MIME type from the extension, so the share sheet offers the right apps.
function mimeFor(name) {
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
  return MIME[ext] ?? 'application/octet-stream';
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function countLabel(n) {
  return `${n} file${n === 1 ? '' : 's'}`;
}

// Projects group scans by subject or experiment. Files stay in this app until shared.
export default function ProjectsScreen() {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState(null);
  const [projects, setProjects] = useState([]); // [{ name, fileCount }]
  const [name, setName] = useState('');
  const [open, setOpen] = useState(null); // name of the project on screen
  const [files, setFiles] = useState([]); // files in that project: [{ name, size }]

  // Runs one action with a busy state and a readable message if it fails.
  const run = async (label, task) => {
    setBusy(label);
    setMessage(null);
    try {
      await task();
    } catch (error) {
      console.error('Projects Error:', error);
      setMessage(error?.message ?? 'Something went wrong. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const reloadProjects = () => setProjects(listProjects());
  const refreshFiles = () => setFiles(listFiles(open));

  useEffect(() => {
    run('load', async () => reloadProjects());
  }, []);

  const create = () =>
    run('create', async () => {
      createProject(name);
      setName('');
      reloadProjects();
    });

  const openProject = (project) =>
    run('open', async () => {
      setFiles(listFiles(project));
      setOpen(project);
    });

  const closeProject = () =>
    run('close', async () => {
      setOpen(null);
      setFiles([]);
      reloadProjects();
    });

  const addFiles = () =>
    run('add', async () => {
      const picked = await pickAnyFiles({ multiple: true });
      if (picked.length === 0) return;
      try {
        await importFiles(open, picked.map((asset) => ({ uri: asset.uri, name: asset.name })));
      } finally {
        // Refresh even when a copy fails, so files saved before the failure still show.
        refreshFiles();
      }
    });

  const shareOne = (file) =>
    run('share', () =>
      shareFile(projectFileUri(open, file.name), {
        mimeType: mimeFor(file.name),
        dialogTitle: 'Share file',
      })
    );

  const askDeleteFile = (file) =>
    Alert.alert('Delete file?', `"${file.name}" is removed from this project. This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          run('delete', async () => {
            deleteFile(open, file.name);
            refreshFiles();
          }),
      },
    ]);

  const askDeleteProject = () =>
    Alert.alert('Delete project?', `"${open}" and its ${countLabel(files.length)} are removed. This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          run('delete', async () => {
            deleteProject(open);
            setOpen(null);
            setFiles([]);
            reloadProjects();
          }),
      },
    ]);

  return (
    <View style={styles.screen}>
      <ScreenHeader title={open ?? 'Projects'} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.hint}>Files stay in this app. Share a file to save it elsewhere.</Text>

        {open === null ? (
          <>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="New project name"
              placeholderTextColor={colors.muted}
              returnKeyType="done"
              onSubmitEditing={create}
              style={styles.input}
            />
            <Button
              label="New project"
              icon="add-outline"
              variant="solid"
              onPress={create}
              loading={busy === 'create'}
              disabled={busy !== null || !name.trim()}
            />

            {projects.length === 0 ? (
              <Text style={styles.hint}>No projects yet. Make one to group scans by subject or experiment.</Text>
            ) : null}
            {projects.map((project) => (
              <Pressable
                key={project.name}
                onPress={() => openProject(project.name)}
                disabled={busy !== null}
                accessibilityRole="button"
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <View style={styles.rowText}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {project.name}
                  </Text>
                  <Text style={styles.rowMeta}>{countLabel(project.fileCount)}</Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={18} color={colors.muted} />
              </Pressable>
            ))}
          </>
        ) : (
          <>
            <Button label="All projects" icon="arrow-back-outline" variant="ghost" onPress={closeProject} disabled={busy !== null} />
            <Button
              label="Add files"
              icon="add-outline"
              variant="solid"
              onPress={addFiles}
              loading={busy === 'add'}
              disabled={busy !== null}
            />

            {files.length === 0 ? <Text style={styles.hint}>No files in this project yet.</Text> : null}
            {files.map((file) => (
              <View key={file.name} style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {file.name}
                  </Text>
                  <Text style={styles.rowMeta}>{formatSize(file.size)}</Text>
                </View>
                <IconButton name="share-outline" label="Share" onPress={() => shareOne(file)} />
                <IconButton name="trash-outline" label="Delete" onPress={() => askDeleteFile(file)} />
              </View>
            ))}

            <View style={styles.divider} />
            <Button
              label="Delete project"
              icon="trash-outline"
              variant="ghost"
              onPress={askDeleteProject}
              disabled={busy !== null}
            />
          </>
        )}

        {message ? <Text style={styles.message}>{message}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 14,
  },
  hint: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  pressed: {
    opacity: 0.6,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    color: colors.text,
    fontSize: 15,
  },
  rowMeta: {
    color: colors.muted,
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: 4,
  },
  message: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
