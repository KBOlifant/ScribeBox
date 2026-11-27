// Loaded with --import before the tests run. See hooks.mjs
import { register } from "node:module";

register("./hooks.mjs", import.meta.url);
