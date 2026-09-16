/// <reference lib="webworker" />
import {
  env,
  pipeline,
  type FeatureExtractionPipeline,
} from "@huggingface/transformers";
env.allowLocalModels = false;
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.wasmPaths = new URL("/ai/", self.location.origin).href;
}
type Progress = { status: string; progress?: number };
const createExtractor = pipeline as unknown as (
  task: string,
  model: string,
  options: Record<string, unknown>,
) => Promise<FeatureExtractionPipeline>;
let extractor: Promise<FeatureExtractionPipeline> | undefined;
self.onmessage = async (
  event: MessageEvent<{
    query: string;
    items: { id: string; product: string }[];
  }>,
) => {
  try {
    extractor ??= createExtractor(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2",
      {
        revision: "751bff37182d3f1213fa05d7196b954e230abad9",
        dtype: "q8",
        device: "wasm",
        progress_callback: (p: Progress) => {
          if ("status" in p)
            self.postMessage({
              type: "progress",
              message:
                p.status === "progress" && "progress" in p
                  ? `Loading local AI · ${Math.round(p.progress as number)}%`
                  : "Preparing local semantic model…",
            });
        },
      },
    );
    const model = await extractor;
    const { query, items } = event.data;
    self.postMessage({
      type: "progress",
      message: "Comparing product descriptions on your device…",
    });
    const q = await model(query.slice(0, 500), {
      pooling: "mean",
      normalize: true,
    });
    const vector = Array.from(q.data as Float32Array);
    const scores: Record<string, number> = {};
    for (let i = 0; i < items.length; i += 16) {
      const batch = items.slice(i, i + 16);
      const embeddings = await model(
        batch.map((item) => item.product.slice(0, 500)),
        { pooling: "mean", normalize: true },
      );
      const vectors = embeddings.tolist() as number[][];
      batch.forEach((item, j) => {
        scores[item.id] = vectors[j].reduce(
          (sum, value, k) => sum + value * vector[k],
          0,
        );
      });
      self.postMessage({
        type: "progress",
        message: `Compared ${Math.min(i + 16, items.length)} of ${items.length} inventory descriptions`,
      });
    }
    self.postMessage({ type: "result", scores });
  } catch (error) {
    extractor = undefined;
    self.postMessage({
      type: "error",
      message:
        error instanceof Error ? error.message : "Semantic model unavailable",
    });
  }
};
