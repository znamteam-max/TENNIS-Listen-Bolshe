import fs from "node:fs/promises";
import path from "node:path";

export function createJsonStateStore(config) {
  if (config.stateStore !== "json") {
    throw new Error(`Unsupported STATE_STORE: ${config.stateStore}`);
  }

  let loaded = false;
  let data = {};
  let writeQueue = Promise.resolve();

  async function load() {
    if (loaded) return;
    await fs.mkdir(path.dirname(config.stateFile), { recursive: true });
    try {
      const raw = await fs.readFile(config.stateFile, "utf8");
      data = raw.trim() ? JSON.parse(raw) : {};
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      data = {};
      await fs.writeFile(config.stateFile, "{}\n", "utf8");
    }
    loaded = true;
  }

  async function persist() {
    await load();
    const body = JSON.stringify(data, null, 2);
    writeQueue = writeQueue.then(async () => {
      const tmpFile = `${config.stateFile}.tmp`;
      await fs.writeFile(tmpFile, `${body}\n`, "utf8");
      await fs.rename(tmpFile, config.stateFile);
    });
    return writeQueue;
  }

  return {
    async get(key) {
      await load();
      return data[key] ?? null;
    },

    async set(key, value) {
      await load();
      data[key] = value;
      await persist();
      return value;
    },

    async delete(key) {
      await load();
      delete data[key];
      await persist();
    },

    async list(prefix = "") {
      await load();
      return Object.entries(data)
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, value]) => ({ key, value }));
    }
  };
}
