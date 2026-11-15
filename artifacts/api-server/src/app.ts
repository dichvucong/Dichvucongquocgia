import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import { CLERK_PROXY_PATH, clerkProxyMiddleware, getClerkProxyHost } from "./middlewares/clerkProxyMiddleware";
import { ContentError } from "./lib/publication";
import { ObjectNotFoundError } from "./lib/objectStorage";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(cors({ credentials: true, origin: false }));
app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: false, limit: "32kb" }));
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);
app.use(((err, req, res, _next) => {
  if (res.headersSent) { res.end(); return; }
  if (err instanceof ContentError) { res.status(err.status).json({ error: err.message }); return; }
  if (err instanceof ObjectNotFoundError) { res.status(404).json({ error: "Chưa tìm thấy tệp ảnh đã tải lên." }); return; }
  if (err?.type === "entity.parse.failed") { res.status(400).json({ error: "Dữ liệu JSON không hợp lệ." }); return; }
  req.log.error({ name: err?.name }, "Request failed");
  res.status(500).json({ error: "Không xử lý được yêu cầu. Vui lòng thử lại." });
}) as express.ErrorRequestHandler);

export default app;
