import { randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';

// Uploaded files (manual attachments, site images) on disk, under one folder that is a Docker
// volume. Postgres keeps only their metadata. A key is a relative path such as "manuals/12/nl".

const TEMP_SUFFIX = '.tmp';
// Inside the files folder, so renaming a staged file to its key stays on one volume.
const STAGING_DIR = '.staging';

// A file written to disk but not yet at its key: see FileStore.stage.
export type StagedFile = { tempPath: string };

/**
 * Turns a key into an absolute path inside rootDir, and refuses a key that would land outside it
 * (e.g. "../x"), so a bad key can never read or overwrite another file on the server.
 * @param rootDir the files folder (appConfig.filesDir)
 * @param key relative path built from validated values, e.g. "site-images/1/logo"
 * Returns: the absolute path; throws when the key points outside rootDir.
 */
export function resolveInside(rootDir: string, key: string): string {
  const root = resolve(rootDir);
  const path = resolve(root, key);
  if (!path.startsWith(root + sep)) {
    throw new Error(`File key points outside the files folder: ${key}`);
  }
  return path;
}

export class FileStore {
  constructor(private readonly rootDir: string) {}

  async write(key: string, buffer: Buffer): Promise<void> {
    await this.place(await this.stage(buffer), key);
  }

  // Writes the file under a unique temporary name, so it can wait until the database rows are
  // saved (place) or be thrown away when they are not (discard). The key may not exist yet: a new
  // manual's id only comes from its insert.
  async stage(buffer: Buffer): Promise<StagedFile> {
    const dir = resolveInside(this.rootDir, STAGING_DIR);
    await mkdir(dir, { recursive: true });
    const tempPath = join(dir, `${randomUUID()}${TEMP_SUFFIX}`);
    await writeFile(tempPath, buffer);
    return { tempPath };
  }

  // A rename, so a download never sees half a file: it gets the old file or the new one.
  async place(staged: StagedFile, key: string): Promise<void> {
    const path = resolveInside(this.rootDir, key);
    await mkdir(dirname(path), { recursive: true });
    await rename(staged.tempPath, path);
  }

  async discard(staged: StagedFile): Promise<void> {
    await rm(staged.tempPath, { force: true });
  }

  async read(key: string): Promise<Buffer> {
    return readFile(resolveInside(this.rootDir, key));
  }

  async remove(key: string): Promise<void> {
    await rm(resolveInside(this.rootDir, key), { force: true });
  }

  async removeDir(key: string): Promise<void> {
    await rm(resolveInside(this.rootDir, key), { recursive: true, force: true });
  }

  // A crash between writing and renaming leaves a temporary file behind that nothing else removes.
  async removeTempFiles(): Promise<void> {
    const root = resolve(this.rootDir);
    await mkdir(root, { recursive: true });
    const entries = await readdir(root, { recursive: true, withFileTypes: true });
    const temps = entries.filter(entry => entry.isFile() && entry.name.endsWith(TEMP_SUFFIX));
    await Promise.all(temps.map(entry => rm(join(entry.parentPath, entry.name), { force: true })));
  }
}
