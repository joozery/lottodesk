import { Router } from "express";
import { Activity, Bill, Counter, Dealer, LayOff, Payment, Period, PrizeResultModel } from "../models";

export function adminRouter() {
  const r = Router();

  r.post("/reset-business-data", async (_req, res) => {
    const [dealers, periods, bills, payments, activities, prizeResults, layoff, counters] = await Promise.all([
      Dealer.deleteMany({}),
      Period.deleteMany({}),
      Bill.deleteMany({}),
      Payment.deleteMany({}),
      Activity.deleteMany({}),
      PrizeResultModel.deleteMany({}),
      LayOff.deleteMany({}),
      Counter.deleteMany({}),
    ]);
    res.json({
      deleted: {
        dealers: dealers.deletedCount,
        periods: periods.deletedCount,
        bills: bills.deletedCount,
        payments: payments.deletedCount,
        activities: activities.deletedCount,
        prizeResults: prizeResults.deletedCount,
        layoff: layoff.deletedCount,
        counters: counters.deletedCount,
      },
      preserved: ["users", "rates", "rateOverrides", "appSettings"],
    });
  });

  return r;
}
