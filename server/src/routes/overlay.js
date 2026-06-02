import { Router } from "express";
import { proxyHtmlRoute } from "../services/renderOverlay.js";

export function createOverlayRouter({ config }) {
  const router = Router();

  router.get(["/", "/overlay.html"], async (req, res, next) => {
    try {
      await proxyHtmlRoute(req, res, config);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
