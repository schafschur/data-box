import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storageRouter from "./storage";
import categoriesRouter from "./categories";
import instancesRouter from "./instances";
import blocksRouter from "./blocks";
import todoItemsRouter from "./todo_items";
import calendarEventsRouter from "./calendar_events";
import photosRouter from "./photos";
import analysisRouter from "./analysis";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use(categoriesRouter);
router.use(instancesRouter);
router.use(blocksRouter);
router.use(todoItemsRouter);
router.use(calendarEventsRouter);
router.use(photosRouter);
router.use(analysisRouter);

export default router;
