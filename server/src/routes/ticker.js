import { Router } from "express";
import { proxyTickerRoute } from "../services/renderTicker.js";

export function createTickerRouter({ config }) {
  const router = Router();

  router.get(["/news-ticker.html", "/ticker.html", "/news-ticker-flex.html"], async (req, res, next) => {
    try {
      await proxyTickerRoute(req, res, config);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
