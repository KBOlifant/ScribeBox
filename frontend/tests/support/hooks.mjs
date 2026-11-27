// Node module hooks so tests can import the app's server code outside Next.js:
// "@/..." resolves to the project root, "server-only" becomes an empty module,
// and extensionless relative imports find their .ts file
const root = new URL("../../", import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return { url: "data:text/javascript,", shortCircuit: true };
  }
  if (specifier.startsWith("@/")) {
    specifier = new URL(specifier.slice(2), root).href;
  }
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    const relative = specifier.startsWith(".") || specifier.startsWith("file:");
    if (relative && !/\.[cm]?[jt]s$/.test(specifier)) {
      for (const extension of [".ts", "/index.ts"]) {
        try {
          return await nextResolve(specifier + extension, context);
        } catch {
          // try the next extension
        }
      }
    }
    throw error;
  }
}
