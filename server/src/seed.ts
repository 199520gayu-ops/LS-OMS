import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "./models";

(async () => {
  await mongoose.connect(process.env.MONGO_URI as string);
  const pw = await bcrypt.hash("Admin@12345", 10);
  // creates the admin once; running it again never resets an existing password
  await User.updateOne({ email: "admin@lsdistributor.in" }, { $set: { name: "Admin", role: "admin" }, $setOnInsert: { password: pw } }, { upsert: true });
  console.log("Admin ready. Login: admin@lsdistributor.in / Admin@12345 (change it after first login)");
  process.exit(0);
})();
