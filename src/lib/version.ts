const globalForVersion = globalThis as unknown as {
  __dataVersion: number | undefined;
};

if (globalForVersion.__dataVersion === undefined) {
  globalForVersion.__dataVersion = 0;
}

export function bumpVersion() {
  globalForVersion.__dataVersion = (globalForVersion.__dataVersion ?? 0) + 1;
}

export function getVersion(): number {
  return globalForVersion.__dataVersion ?? 0;
}
