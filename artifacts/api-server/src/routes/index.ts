import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contentRouter from "./content";
import adminImagesRouter from "./admin-images";

const router: IRouter = Router();

router.use(healthRouter);
router.use(contentRouter);
router.use(adminImagesRouter);

export default router;
