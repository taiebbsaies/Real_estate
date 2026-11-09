// Creates an admin account, or gives the admin role to an existing account.
//
// New account:
//   ADMIN_PASSWORD="..." node --env-file=.env scripts/create-admin.mjs admin@example.com Prénom Nom
// Existing account (its password does not change):
//   node --env-file=.env scripts/create-admin.mjs existing@example.com
//
// The password comes from the environment so that it never appears in a command argument list.
import dns from "node:dns";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const [emailArg, firstName, lastName] = process.argv.slice(2);
const email = emailArg?.trim().toLowerCase();

if (!email || !process.env.MONGODB_URI) {
  console.error("Usage: node --env-file=.env scripts/create-admin.mjs <email> [firstName lastName]");
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

try {
  const users = mongoose.connection.db.collection("users");
  const existing = await users.findOne({ email });

  if (existing) {
    await users.updateOne(
      { _id: existing._id },
      {
        $addToSet: { roles: "ADMIN" },
        $set: { activeRole: "ADMIN", updatedAt: new Date() },
        $unset: { suspendedAt: 1 },
      },
    );
    console.log(`${email} is now an admin. Log out and back in to use the admin page.`);
  } else {
    const password = process.env.ADMIN_PASSWORD;
    const strong =
      password &&
      password.length >= 8 &&
      password.length <= 72 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^A-Za-z0-9]/.test(password);

    if (!firstName || !lastName || !strong) {
      console.error(
        "A new account needs a first name, a last name and ADMIN_PASSWORD: 8 to 72 characters with an uppercase letter, a lowercase letter, a number and a symbol.",
      );
      process.exitCode = 1;
    } else {
      const now = new Date();
      await users.insertOne({
        firstName,
        lastName,
        email,
        passwordHash: await bcrypt.hash(password, 12),
        roles: ["ADMIN"],
        activeRole: "ADMIN",
        createdAt: now,
        updatedAt: now,
      });
      console.log(`Admin account created for ${email}.`);
    }
  }
} finally {
  await mongoose.disconnect();
}
