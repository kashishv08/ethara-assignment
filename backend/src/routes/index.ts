import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import projectsRouter from "./projects";
import tasksRouter from "./tasks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(projectsRouter);
router.use(tasksRouter);

export default router;
