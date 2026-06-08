import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storageRouter from "./storage";
import categoriesRouter from "./categories";
import instancesRouter from "./instances";
import blocksRouter from "./blocks";
import todoItemsRouter from "./todo_items";
import calendarEventsRouter from "./calendar_events";
import photosRouter from "./photos";
import pdfsRouter from "./pdfs";
import analysisRouter from "./analysis";
import mapRouter from "./map";
import searchRouter from "./search";
import upcomingEventsRouter from "./upcoming_events";
import contactCardsRouter from "./contact_cards";
import listItemsRouter from "./list_items";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use(categoriesRouter);
router.use(instancesRouter);
router.use(blocksRouter);
router.use(todoItemsRouter);
router.use(calendarEventsRouter);
router.use(photosRouter);
router.use(pdfsRouter);
router.use(analysisRouter);
router.use(mapRouter);
router.use(searchRouter);
router.use(upcomingEventsRouter);
router.use(contactCardsRouter);
router.use(listItemsRouter);

export default router;
