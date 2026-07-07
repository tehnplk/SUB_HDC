const { open, stat, unlink } = require("node:fs/promises");

// Uploaded ZIPs hold unencrypted health data; overwrite with zeros before
// unlinking so the plain content does not linger in freed disk blocks.
async function secureDelete(filePath) {
  try {
    const fileStat = await stat(filePath);
    const size = fileStat.size;
    if (size > 0) {
      const handle = await open(filePath, "r+");
      const buffer = Buffer.alloc(Math.min(size, 64 * 1024), 0);
      let written = 0;
      while (written < size) {
        const toWrite = Math.min(buffer.length, size - written);
        await handle.write(buffer, 0, toWrite, written);
        written += toWrite;
      }
      await handle.sync();
      await handle.close();
    }
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.error("Error during secure delete:", error);
    }
  } finally {
    await unlink(filePath).catch(() => {});
  }
}

module.exports = { secureDelete };
