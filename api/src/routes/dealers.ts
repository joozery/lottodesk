import { Router } from "express";
import { z } from "zod";
import { HttpError, parse } from "../middleware/http.js";
import { Dealer, nextSeq } from "../models.js";
import { pubDealer } from "../serialize.js";

const nameBody = z.object({ name: z.string().trim().min(1, "กรุณากรอกชื่อ").max(100) });

export function dealersRouter() {
  const r = Router();

  r.get("/", async (_req, res) => {
    res.json((await Dealer.find().sort({ createdAt: 1 }).lean()).map(pubDealer));
  });

  r.post("/", async (req, res) => {
    const { name } = parse(nameBody, req.body);
    res.status(201).json(pubDealer((await Dealer.create({ name })).toObject()));
  });

  r.post("/:dealerId/collectors", async (req, res) => {
    const { name } = parse(nameBody, req.body);
    const dealer = await Dealer.findByIdAndUpdate(req.params.dealerId, { $push: { collectors: { name, customers: [] } } }, { returnDocument: "after" }).lean();
    if (!dealer) throw new HttpError(404, "ไม่พบเจ้ามือ");
    res.status(201).json(pubDealer(dealer));
  });

  r.post("/:dealerId/collectors/:collectorId/customers", async (req, res) => {
    const { name } = parse(nameBody, req.body);
    const code = `CUS-${String(await nextSeq("customer")).padStart(3, "0")}`;
    const dealer = await Dealer.findOneAndUpdate(
      { _id: req.params.dealerId, "collectors._id": req.params.collectorId },
      { $push: { "collectors.$.customers": { code, name } } },
      { returnDocument: "after" },
    ).lean();
    if (!dealer) throw new HttpError(404, "ไม่พบเจ้ามือหรือผู้ส่งโพย");
    res.status(201).json(pubDealer(dealer));
  });

  return r;
}
