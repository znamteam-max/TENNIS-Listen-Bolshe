import { Router } from "express";
import { oddsPayload } from "../services/oddsStore.js";

export function createOddsRouter({ oddsStore }) {
  const router = Router();

  router.get("/api/odds/current", async (req, res, next) => {
    try {
      const state = await oddsStore.current(req.query.matchId);
      res.set("cache-control", "no-store").json(oddsPayload(state));
    } catch (error) {
      next(error);
    }
  });

  router.post("/api/odds/manual", async (req, res, next) => {
    try {
      const state = await oddsStore.manual(req.body || {});
      res.set("cache-control", "no-store").json(oddsPayload(state));
    } catch (error) {
      next(error);
    }
  });

  router.post("/api/odds/winline/link", async (req, res, next) => {
    try {
      const state = await oddsStore.link(req.body || {});
      res.set("cache-control", "no-store").json(oddsPayload(state));
    } catch (error) {
      next(error);
    }
  });

  router.post("/api/odds/winline/disable", async (req, res, next) => {
    try {
      const state = await oddsStore.disable(req.body || {});
      res.set("cache-control", "no-store").json(oddsPayload(state));
    } catch (error) {
      next(error);
    }
  });

  router.post("/api/odds/reset", async (req, res, next) => {
    try {
      const state = await oddsStore.reset(req.body || {});
      res.set("cache-control", "no-store").json(oddsPayload(state));
    } catch (error) {
      next(error);
    }
  });

  router.get("/api/odds/active", async (req, res, next) => {
    try {
      oddsStore.assertSecret(req, true);
      const matches = await oddsStore.active();
      res.set("cache-control", "no-store").json({
        ok: true,
        runtime: "node",
        buildVersion: "node-mirror-v1",
        count: matches.length,
        matches
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/api/odds/push", async (req, res, next) => {
    try {
      oddsStore.assertSecret(req, false);
      const state = await oddsStore.push(req.body || {});
      res.set("cache-control", "no-store").json(oddsPayload(state));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
