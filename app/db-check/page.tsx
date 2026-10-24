import { connectDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export default async function DatabaseCheckPage() {
  let connected = false;

  try {
    await connectDB();
    connected = true;
  } catch (error) {
    console.error("MongoDB connection failed:", error);
  }

  if (connected) {
    return (
      <main style={{ padding: "2rem" }}>
        <h1>HomeCheck Database Check</h1>
        <p>✅ MongoDB connected successfully!</p>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem" }}>
      <h1>HomeCheck Database Check</h1>
      <p>❌ Could not connect to MongoDB.</p>
      <p>Check your terminal for the error details.</p>
    </main>
  );
}
