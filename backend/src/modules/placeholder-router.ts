import { Router } from "express";

export function createPlaceholderRouter(moduleName: string) {
  const router = Router();

  router.get("/", (_request, response) => {
    response.json({
      module: moduleName,
      message: `${moduleName} API scaffold is ready for implementation.`,
    });
  });

  return router;
}
